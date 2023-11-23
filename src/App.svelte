<script>
import { onMount } from 'svelte';
import * as K from 'konva';

// hackery: the canvas/stage element is abs positioned so that as you resize the window, the right pane doesn't shift offscreen.
// to make this work, we have an in-DOM element (called stagePlaceholder) that the browser resizes as needed, and then anytime
// a resize happens, we resize the konva.Stage object which resizes the actual canvas element.
let stage, stagePlaceholderEl, gridLayer;
onMount(() =>
{
    stage = new K.Stage({
        container: 'actualStageHolder',
        draggable:false,
        width: stagePlaceholderEl.offsetWidth,
        height: stagePlaceholderEl.offsetHeight
    });
    stage.on('wheel', OnMouseWheel);
    stage.on('contextmenu', e => e.evt.preventDefault()); // don't show right-click menu

    gridLayer = new K.Layer()
    stage.add(gridLayer);

    var layer = new K.Layer();

    // create our shape
    var circle = new K.Circle({
      x: stage.width() / 2,
      y: stage.height() / 2,
      radius: 70,
      fill: 'red',
      stroke: 'black',
      strokeWidth: 4
    });

    // add the shape to the layer
    layer.add(circle);

    // add the layer to the stage
    stage.add(layer);
    DrawGrid(50, 40);
});

function DrawGrid(numX, numY)
{
    const TILE_SIZE = 50;
    let strokeParams = {stroke:'black', strokeWidth:2};
    let w = TILE_SIZE*numX;
    let h = TILE_SIZE*numY;
    gridLayer.destroyChildren();
    gridLayer.add(new K.Rect({x:0, y:0, width:w, height:h, ...strokeParams}));
    for (let i=1; i < numX; i++)
    {
        let x = TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[x, 0, x, h], ...strokeParams}));
    }

    for (let i=1; i < numY; i++)
    {
        let y = TILE_SIZE*i;
        gridLayer.add(new K.Line({points:[0, y, w, y], ...strokeParams}));
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

// starts the drag-by-right-button process
let panStartOffset=null;
function OnMouseDown(e)
{
    if (e.button == 2) // right click
    {
        e.preventDefault();
        panStartOffset = [stage.x()-e.clientX, stage.y()-e.clientY];
    }
}

function OnMouseMove(e)
{
    if (panStartOffset != null) // right button up
    {
        e.preventDefault();
        stage.position({x:e.clientX+panStartOffset[0], y:e.clientY+panStartOffset[1]});
    }
}

function OnMouseUp(e)
{
    if (e.button == 2 && panStartOffset != null) // right button up
    {
        e.preventDefault();
        panStartOffset = null;
    }
}

async function OnWindowResize()
{
    stage.size({width:stagePlaceholderEl.offsetWidth, height:stagePlaceholderEl.offsetHeight});
}

</script>

<svelte:window on:resize={OnWindowResize}/>
<screen>
    <clientArea>
    <stagePlaceholder bind:this={stagePlaceholderEl} />
        <infoPane>
            <boardInfo>
                board info/tools
            </boardInfo>
            <tileInfo>
                tile info/tools
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
</style>

