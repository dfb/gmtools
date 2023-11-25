<script>
import { onMount } from 'svelte';
import * as K from 'konva';
import * as Modal from './modal.svelte';
import ModalChoose from './modal_choose.svelte';

// returns a promise that resolves to the index of the button that was clicked. Adds a Cancel button to the list
// of buttons by default; clicking it or hitting Escape or clicking the overlay makes the promise resolve to -1.
window.ChooseModal = function(body, title, nonCancelButtonLabels, addCancelButton=true)
{
    return new Promise((resolve, reject) =>
    {
        OpenModal(ModalChoose, {title, body, nonCancelButtonLabels, addCancelButton}).then(({closeCode, comp}) => resolve(comp.choseIndex));
    });
}

// gets the user to confirm an action. Returns a promise that is resolved *only* if the user clicks the ok button
window.ConfirmModal = function(body, title='Proceed?', okLabel='Ok')
{
    return new Promise((resolve, reject) =>
    {
        OpenModal(ModalChoose, {title, body, nonCancelButtonLabels:[okLabel]}).then(({closeCode, comp}) =>
        {
            if (comp.choseIndex == 0) // the ok button
                resolve();
        });
    });
}

// simple way to show the user an alert
window.AlertModal = function(body, title=' ')
{
    return ChooseModal(body, title, ['Ok'], false);
}

const GRID_W = 20; // number of tiles in X and Y. TODO: this will become configurable
const GRID_H = 15;
const TILE_SIZE = 64; // size of tiles in pixels in both X and Y directions

let paintToolGroups = [ // list of rows of objects describing different tools you can paint with. id must be unique.
    {
        label:'Type:',
        tools:[
            {id:'tGrass', propName:'type', propValue:'ttGrass'},
            {id: 'tWater', propName:'type', propValue:'ttWater'},
            {id: 'tForest', propName:'type', propValue:'ttForest'},
            {id: 'tLava', propName:'type', propValue:'ttLava'},
            {id: 'tMtn', propName:'type', propValue:'ttMtn'},
            {id: 'tField', propName:'type', propValue:'ttField'},
            {id: 'tCastle', propName:'type', propValue:'ttCastle'},
            {id: 'tSand', propName:'type', propValue:'ttSand'},
        ]
    },
    {
        label:'Lighting:',
        tools:[
            {id:'lNormal', propName:'light', propValue:'#00000000'},
            {id:'lDim', propName:'light', propValue:'#00000050'},
            {id:'lDark', propName:'light', propValue:'#00000090'}
        ]
    },
    {
        label:'Movement:',
        tools:[
        ]
    }
];
let curPaintTool = paintToolGroups[0].tools[0]; // one of the paintTools, i.e. which one is currently selected

// hackery: the canvas/stage element is abs positioned so that as you resize the window, the right pane doesn't shift offscreen.
// to make this work, we have an in-DOM element (called stagePlaceholder) that the browser resizes as needed, and then anytime
// a resize happens, we resize the konva.Stage object which resizes the actual canvas element.
let modalHolder, stage, stagePlaceholderEl, gridLayer, tileTypeLayer, tileLightLayer, tileMovementLayer;
onMount(() =>
{
    Modal.Init(modalHolder);
    LoadImages();
    stage = new K.Stage({
        container: 'actualStageHolder',
        draggable:false,
        width: stagePlaceholderEl.offsetWidth,
        height: stagePlaceholderEl.offsetHeight
    });
    stage.on('wheel', OnMouseWheel);
    stage.on('contextmenu', e => e.evt.preventDefault()); // don't show right-click menu

    // the tile type layer holds a konva Image instance for each grid square (tile) showing the ground type
    tileTypeLayer = new K.Layer();
    stage.add(tileTypeLayer);

    // the tile light layer holds a konva Rect for each tile to show normal vs dim vs dark lighting
    tileLightLayer = new K.Layer();
    stage.add(tileLightLayer);

    // the grid layer just holds lines that draw the visible grid
    gridLayer = new K.Layer()
    stage.add(gridLayer);
    DrawGrid();

    SetupGrid();
});

// sets up the global grid to be a 2D array of objects with info and images for each tile on the grid
let tiles;
function SetupGrid()
{
    tiles = [];
    for (let x=0; x < GRID_W; x++) // we'll make it like the screen, X coord indexes into a column of entries
    {
        let col = [];
        for (let y=0; y < GRID_H; y++)
        {
            let entry = {};
            col.push(entry);

            // do any per-tile initialization here
            entry.x = x;
            entry.y = y;
            entry.px = x*TILE_SIZE; // px,py = pixel coordinates of top-left of this tile
            entry.py = y*TILE_SIZE;

            entry.type = 'empty';
            entry.typeImage = new K.Image({x:entry.px, y:entry.py});
            tileTypeLayer.add(entry.typeImage);

            entry.lightRect = new K.Rect({x:entry.px, y:entry.py, width:TILE_SIZE, height:TILE_SIZE});
            tileLightLayer.add(entry.lightRect);
        }
        tiles.push(col);
    }
}

// called on startup to create Image objects for any assets we'll reuse
let imageCache = { // name -> obj w/ attrs .url, .image (Image object)
    ttGrass:{url:'/images/tile_grass.png'},
    ttWater:{url:'/images/tile_water.jpg'},
    ttForest:{url:'/images/tile_forest.jpg'},
    ttLava:{url:'/images/tile_lava.jpg'},
    ttMtn:{url:'/images/tile_mtn.jpg'},
    ttField:{url:'/images/tile_field.jpg'},
    ttCastle:{url:'/images/tile_castle.jpg'},
    ttSand:{url:'/images/tile_sand.jpg'},
}; // name -> obj w/ attrs .url, .image (Image object), .loaded (t|f)
function LoadImages()
{
    for (let [k,entry] of Object.entries(imageCache))
    {
        entry.loaded = false;
        entry.image = new Image();
        entry.image.onload = () => entry.loaded = true;
        entry.image.src = entry.url;
    }
}

// clears and redraws the grid lines
function DrawGrid()
{
    let strokeParams = {stroke:'black', strokeWidth:2};
    let w = TILE_SIZE*GRID_W;
    let h = TILE_SIZE*GRID_H;
    gridLayer.destroyChildren();
    gridLayer.add(new K.Rect({x:0, y:0, width:w, height:h, ...strokeParams}));
    for (let i=1; i < GRID_W; i++)
    {
        let x = TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[x, 0, x, h], ...strokeParams}));
    }

    for (let i=1; i < GRID_H; i++)
    {
        let y = TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[0, y, w, y], ...strokeParams}));
    }

    if (curTilePos != null)
    {   // show one tile as selected
        let [x,y] = curTilePos;
        x *= TILE_SIZE;
        y *= TILE_SIZE;
        gridLayer.add(new K.Rect({x, y, width:TILE_SIZE, height:TILE_SIZE, stroke:'white', strokeWidth:2}));
    }
}

// scale the stage relative to where the cursor is
// from https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
const ZOOM_SCALE_FACTOR = 1.1;
function OnMouseWheel(e)
{
    e.evt.preventDefault();
    let oldScale = stage.scaleX();
    let pointer = stage.getPointerPosition();
    let mousePointTo = {x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale};

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? 1 : -1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey)
        direction = -direction;

    let newScale = direction <= 0 ? oldScale * ZOOM_SCALE_FACTOR : oldScale / ZOOM_SCALE_FACTOR;
    stage.scale({ x: newScale, y: newScale });

    let newPos = {x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale};
    stage.position(newPos);
}

let panStartOffset=null; // for moving around the view of the board
let paintingTiles = false;
let curTilePos = null; // [tileX, tileY] of currently selected tile or null
$:curTile = curTilePos != null ? tiles[curTilePos[0]][curTilePos[1]] : null;

function OnMouseDown(e)
{
    if (e.button == 0)
    {
        if (e.shiftKey)
        {   // begin painting tile properties
            paintingTiles = true;
            PaintTile();
            e.preventDefault();
        }
        else
        {   // select this tile
            let [x,y] = TilePosUnderCursor();
            if (x == -1)
                curTilePos = null;
            else
                curTilePos = [x,y];
            DrawGrid();
        }
    }
    else if (e.button == 2) // right click
    {
        e.preventDefault();
        panStartOffset = [stage.x()-e.clientX, stage.y()-e.clientY];
    }
}

function OnMouseMove(e)
{
    if (paintingTiles)
    {
        if (e.shiftKey)
        {
            e.preventDefault();
            PaintTile();
        }
    }
    else if (panStartOffset != null) // right button up
    {
        e.preventDefault();
        stage.position({x:e.clientX+panStartOffset[0], y:e.clientY+panStartOffset[1]});
    }
}

function OnMouseUp(e)
{
    if (e.button == 0 && paintingTiles)
    {
        e.preventDefault();
        paintingTiles = false;
    }
    else if (e.button == 2 && panStartOffset != null) // right button up
    {
        e.preventDefault();
        panStartOffset = null;
    }
}

// returns the [x,y] of the tile under the cursor or [-1,-1] if the cursor is outside the grid
function TilePosUnderCursor()
{
    let {x, y} = stage.getRelativePointerPosition();
    x = Math.trunc(x / TILE_SIZE);
    y = Math.trunc(y / TILE_SIZE);
    if (x < 0 || y < 0 || x > GRID_W-1 || y > GRID_H-1) return [-1,-1]; // outside of the grid
    return [x,y];
}

// called by mouse down/move when painting tiles - figures out which tile the mouse is over,
// updates its properties in the board, and updates the canvas to show the updated tile
function PaintTile()
{
    if (!curPaintTool) return;
    let [x,y] = TilePosUnderCursor();
    if (x == -1) return; // outside the grid
    let entry = tiles[x][y];

    let tool = curPaintTool;
    if (tool.propName == 'type')
    {
        entry.type = tool.propValue;
        entry.typeImage.image(imageCache[tool.propValue].image);
    }
    else if (tool.propName == 'light')
        entry.lightRect.fill(tool.propValue);
}

async function OnWindowResize()
{
    stage.size({width:stagePlaceholderEl.offsetWidth, height:stagePlaceholderEl.offsetHeight});
}

function SelectPaintTool(tool)
{
    curPaintTool = tool;
}

</script>

<svelte:window on:resize={OnWindowResize}/>
<screen>
    <clientArea>
        <stagePlaceholder bind:this={stagePlaceholderEl} />
        <infoPane>
            <boardInfo>
                {#each paintToolGroups as group}
                    <toolGroup>
                        <groupTitle>{group.label}</groupTitle>
                        {#each group.tools as tool}
                            <paintTool class:selected={curPaintTool && curPaintTool.id == tool.id}>
                                <button on:click={()=>SelectPaintTool(tool)}>{tool.id}</button>
                            </paintTool>
                        {/each}
                    </toolGroup>
                {/each}
                Note: hold shift while dragging with the left mouse button to "paint" using any of the above tools.
            </boardInfo>
            <tileInfo>
                {#if curTilePos}
                    <p>Tile: {curTilePos[0]}, {curTilePos[1]}</p>
                    <p>Type: {curTile.type}</p>
                {/if}
            </tileInfo>
            <appButtons>
                app buttons go here
            </appButtons>
        </infoPane>
    </clientArea>
    <messageArea>
        message area
    </messageArea>
</screen>

<div id="actualStageHolder" on:mousedown={OnMouseDown} on:mousemove={OnMouseMove} on:mouseup={OnMouseUp}/>
<modalholder bind:this={modalHolder} /> <!-- keep this near the end so it's on top -->

<style>
screen {
    display:flex;
    flex:1;
    align-content:stretch;
    align-items: stretch;
    flex-direction: column;
}

    clientArea {
        background-color:green;
        display:flex;
        flex-direction: row;
        flex-grow:1;
    }

        stagePlaceholder {
            display: block;
            background-color:#ccc;
            flex-grow:1;
            position:relative;
        }

        infoPane {
            display:flex;
            flex-basis:400px;
            flex-direction: column;
            background-color:gray;
        }

            boardInfo {
                display:block;
                color:white;
                background-color:#9999cc;
                padding:5px;
                flex-basis:100px;
            }

                boardInfo toolGroup {
                    display:block;
                    margin-bottom:5px;
                }

                boardInfo toolGroup groupTitle {
                    display:block;
                    font-size:0.8em;
                }

            tileInfo {
                display:block;
                color:white;
                flex:1;
                background-color:#cc99cc;
                padding:5px;
            }

            appButtons {
                display:block;
                color:white;
                background-color:#99cc99;
                padding:5px;
                flex-basis:100px;
            }

    messageArea {
        background-color:red;
        display:block;
        color:white;
        padding:5px;
    }

    #actualStageHolder {
        position:absolute;
    }

paintTool {
    display:inline-block;
}

paintTool.selected {
    border:solid blue 2px;
}
</style>

