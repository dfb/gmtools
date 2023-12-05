<script>
import { onMount } from 'svelte';
import * as K from 'konva';
import * as C from './common.js';
import * as Modal from './modal.svelte';
import * as DB from './db.js';
import ModalChoose from './modal_choose.svelte';
import ModalAddUnit from './modal_addunit.svelte';
import ModalResize from './modal_resize.svelte';

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
let board = null; // the currently loaded board as returned from DB.CreateBoard or DB.LoadBoard
let modalHolder, stage, stagePlaceholderEl, gridLayer, tileTypeLayer, tileLightLayer, tileMovementLayer, tileUnitsLayer;
onMount(() =>
{
    Modal.Init(modalHolder);
    C.LoadImages();
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

    // the tile units layer holds images for all unit icons
    tileUnitsLayer = new K.Layer();
    stage.add(tileUnitsLayer);

    // the grid layer just holds lines that draw the visible grid
    gridLayer = new K.Layer({listening:false}); // don't listen for events, so that we can drag units around on the lower layer
    stage.add(gridLayer);

    // temp hackery until we have the load/create flows done: load the first board if one exists, else create a new one
    // either way, set it to the global 'board' var
    DB.ListBoards().then(boards =>
    {
        if (boards && boards.length)
            DB.LoadBoard(boards[0].id).then(b => InitBoard(b));
        else
            DB.CreateBoard('test', 30, 20).then(b => InitBoard(b));
    });
});

// called after loading or creating a board - saves a ref to the global 'board' var, adds info we need to tiles, triggers the first render
function InitBoard(b)
{
    // TODO: we can't really run this safely until we know the images have loaded

    board = b;

    // set any per-tile info we'll need
    for (let x=0; x < board.w; x++)
    {
        for (let y=0; y < board.h; y++)
        {
            let tile = board.tiles[x][y];
            let px = x*C.TILE_SIZE; // px,py = pixel coords of top-left of this tile
            let py = y*C.TILE_SIZE;

            tile.typeImage = new K.Image({x:px, y:py});
            tileTypeLayer.add(tile.typeImage);
            if (tile.type != 'empty')
                tile.typeImage.image(C.imageCache[tile.type].image);

            tile.lightRect = new K.Rect({x:px, y:py, width:C.TILE_SIZE, height:C.TILE_SIZE});
            tileLightLayer.add(tile.lightRect);
            if (tile.light != 'normal')
                tile.lightRect.fill(tile.light);
        }
    }

    DrawGrid();
    DrawUnits();
}

// clears and redraws the grid lines
function DrawGrid()
{
    let strokeParams = {stroke:'black', strokeWidth:2};
    let w = C.TILE_SIZE*board.w;
    let h = C.TILE_SIZE*board.h;
    gridLayer.destroyChildren();
    gridLayer.add(new K.Rect({x:0, y:0, width:w, height:h, ...strokeParams}));
    for (let i=1; i < board.w; i++)
    {
        let x = C.TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[x, 0, x, h], ...strokeParams}));
    }

    for (let i=1; i < board.h; i++)
    {
        let y = C.TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[0, y, w, y], ...strokeParams}));
    }

    if (curTilePos != null)
    {   // show one tile as selected
        let [x,y] = curTilePos;
        x *= C.TILE_SIZE;
        y *= C.TILE_SIZE;
        gridLayer.add(new K.Rect({x, y, width:C.TILE_SIZE, height:C.TILE_SIZE, stroke:'white', strokeWidth:2}));
    }
}

// clears and redraws any units placed on tiles
function DrawUnits()
{
    tileUnitsLayer.destroyChildren();
    for (let x=0; x < board.w; x++)
    {
        for (let y=0; y < board.h; y++)
        {
            let entry = board.tiles[x][y];
            for (let i=0; i < entry.units.length; i++)
            {
                let unit = entry.units[i];
                unit.image = null;
                let px = x*C.TILE_SIZE;
                let py = y*C.TILE_SIZE;
                if (entry.units.length == 1)
                {   // the normal case: center it in the tile
                    px += C.TILE_SIZE/4;
                    py += C.TILE_SIZE/4;
                }
                else
                {   // if multiple units are on this tile, move them to quadrants
                    if (i == 1 || i == 3)
                        px += C.TILE_SIZE/2;
                    if (i > 1)
                        py += C.TILE_SIZE/2;
                }
                unit.image = new K.Image({draggable:true, x:px, y:py, image:C.imageCache[unit.imageName].image}); // keep a ref so we can drag it
                unit.image.on('dragend', ()=>StopDragging(unit));
                unit.image.on('dragmove', ()=>
                {   // force the unit to stay on the grid
                    let {x,y} = unit.image.position();
                    x = Math.max(0, Math.min(C.TILE_SIZE*board.w-C.TILE_SIZE/2, x));
                    y = Math.max(0, Math.min(C.TILE_SIZE*board.h-C.TILE_SIZE/2, y));
                    unit.image.position({x,y});
                });
                tileUnitsLayer.add(unit.image);
            }
        }
    }
}

// called when the user drops a dragged unit onto a tile
function StopDragging(unit)
{
    let [oldX, oldY] = curTilePos;
    let [newX, newY] = TilePosUnderCursor(true);
    if (oldX == newX && oldY == newY)
    {
        DrawUnits(); // still redraw, to force it into the right spot
        return; // user dropped it on the same tile it was originally in
    }

    // don't let there be more than 4 per tile, at least for now
    let newTile = board.tiles[newX][newY];
    if (newTile.units.length > 3)
    {
        DrawUnits(); // still redraw, to force it into the right spot
        return;
    }

    // remove the unit from the old tile and add it to the new one
    curTile.units = curTile.units.filter(u => u.id != unit.id);
    newTile.units.push(unit);

    // select the tile the unit was dropped on and force a re-render
    unit.pos = [newX, newY];
    curTilePos = [newX, newY];
    DrawUnits();
    DrawGrid(); // to reflect that a new tile has been selected
    DB.SaveBoard(board);
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
let tilesPainted = 0; // during a drag, how many tiles were modified
let curTilePos = null; // [tileX, tileY] of currently selected tile or null
$:curTile = board != null && curTilePos != null ? board.tiles[curTilePos[0]][curTilePos[1]] : null;

function OnMouseDown(e)
{
    if (e.button == 0)
    {
        if (e.shiftKey)
        {   // begin painting tile properties
            paintingTiles = true;
            tilesPainted = 0;
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
        if (tilesPainted)
            DB.SaveBoard(board);
    }
    else if (e.button == 2 && panStartOffset != null) // right button up
    {
        e.preventDefault();
        panStartOffset = null;
    }
}

// returns the [x,y] of the tile under the cursor or [-1,-1] if the cursor is outside the grid
// if forceValid is true, the position is clipped to be inside the grid.
function TilePosUnderCursor(forceValid=false)
{
    let {x, y} = stage.getRelativePointerPosition();
    x = Math.trunc(x / C.TILE_SIZE);
    y = Math.trunc(y / C.TILE_SIZE);
    if (forceValid)
    {
        x = Math.max(0, Math.min(board.w-1, x));
        y = Math.max(0, Math.min(board.h-1, y));
    }
    if (x < 0 || y < 0 || x > board.w-1 || y > board.h-1) return [-1,-1]; // outside of the grid
    return [x,y];
}

// called by mouse down/move when painting tiles - figures out which tile the mouse is over,
// updates its properties in the board, and updates the canvas to show the updated tile
function PaintTile()
{
    if (!curPaintTool) return;
    tilesPainted++;
    let [x,y] = TilePosUnderCursor();
    if (x == -1) return; // outside the grid
    let tile = board.tiles[x][y];

    let tool = curPaintTool;
    if (tool.propName == 'type')
    {
        tile.type = tool.propValue;
        tile.typeImage.image(C.imageCache[tool.propValue].image);
    }
    else if (tool.propName == 'light')
    {
        tile.lightRect.fill(tool.propValue);
        tile.light = tool.propValue;
    }
}

// called when the window resizes and resizes the stage (canvas) to be the same size as the stage placeholder element
async function OnWindowResize()
{
    stage.size({width:stagePlaceholderEl.offsetWidth, height:stagePlaceholderEl.offsetHeight});
}

function SelectPaintTool(tool)
{
    curPaintTool = tool;
}

// called when the user clicks the 'add unit' button on a tile to show them a modal to select the new unit
function StartAddingUnit()
{
    OpenModal(ModalAddUnit).then(({closeCode, comp}) =>
    {
        if (closeCode != MODAL_OK) return;
        console.log('Spawning', comp.unit);
        let unit = {id:C.GetUnitID(), ...comp.unit};
        unit.pos = curTilePos;
        curTile.units.push(unit);
        curTilePos = curTilePos; // trigger a re-render
        DrawUnits();
        DB.SaveBoard(board);
    });
}

function OpenResizeModal()
{
    OpenModal(ModalResize, {curW:board.w, curH:board.h}).then(({closeCode, comp}) =>
    {
        if (closeCode != MODAL_OK) return;
        let {width, height} = comp.size;
        DB.ResizeBoard(board, width, height).then(newBoard => InitBoard(newBoard));
    });
}

// removes unit at the given index from the currently selected tile
function RemoveUnit(i)
{
    curTile.units.splice(i, 1);
    curTilePos = curTilePos; // trigger a re-render
    DrawUnits();
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
                    <p>Lighting: {curTile.light}</p>

                    <p>Units on this tile:</p>
                    <ul>
                    {#each curTile.units as unit,i}
                        <li>
                            <button title="Delete this unit" on:click={()=>RemoveUnit(i)}>X</button>
                            <img src={C.imageCache[unit.imageName].url}/>
                            {unit.name} (AC: {unit.ac}

                            <button on:click={()=> unit.ac= Math.max(0, unit.ac-1)}>-</button>
                            <input style="width:20px" bind:value={unit.ac}/>
                            <button on:click={()=> unit.ac++}>+</button>

                            HP:
                            <button on:click={()=> unit.health = Math.max(0, unit.health-1)}>-</button>
                            <input style="width:20px" bind:value={unit.health}/>
                            <button on:click={()=> unit.health++}>+</button>
                            )
                        </li>
                    {/each}
                    </ul>
                    <button on:click={StartAddingUnit} disabled={curTile.units.length>3}>Add unit</button>
                {/if}
            </tileInfo>
            <appButtons>
                <button on:click={OpenResizeModal} >Resize</button>
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

            tileInfo > ul {
                padding:0;
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

