<script>
import { onMount } from 'svelte';
import * as K from 'konva';

// hackery: the canvas/stage element is abs positioned so that as you resize the window, the right pane doesn't shift offscreen.
// to make this work, we have an in-DOM element (called stagePlaceholder) that the browser resizes as needed, and then anytime
// a resize happens, we resize the konva.Stage object which resizes the actual canvas element.
let stage, stagePlaceholderEl;
onMount(() =>
{
    stage = new K.Stage({
        container: 'actualStageHolder',
        draggable:true,
        width: stagePlaceholderEl.offsetWidth,
        height: stagePlaceholderEl.offsetHeight
    });
    stage.on('wheel', OnMouseWheel);

    // then create layer
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

// draw the image
//layer.draw();
});

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
                board info
            </boardInfo>
            <tileInfo>
                tile info
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
<div id="actualStageHolder"/>

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
            background-color:yellow;
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

<!--
<Stage config={{ width, height }}>
    <Layer>
        {#each list as item (item.id)}
            <Star
                config={{
                    x: item.x,
                    y: item.y,
                    rotation: item.rotation,
                    id: item.id,
                    numPoints: 5,
                    innerRadius: 30,
                    outerRadius: 50,
                    fill: "#89b717",
                    opacity: 0.8,
                    draggable: true,
                    scaleX:
                        dragItemId === item.id ? item.scale * 1.2 : item.scale,
                    scaleY:
                        dragItemId === item.id ? item.scale * 1.2 : item.scale,
                    shadowColor: "black",
                    shadowBlur: 10,
                    shadowOffsetX: dragItemId === item.id ? 15 : 5,
                    shadowOffsetY: dragItemId === item.id ? 15 : 5,
                    shadowOpacity: 0.6,
                }}
                bind:handle={item.handle}
                on:dragstart={handleDragStart}
                on:dragend={handleDragEnd}
            />
        {/each}
    </Layer>
</Stage>
-->
