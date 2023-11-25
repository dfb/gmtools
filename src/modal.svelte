<script context="module">
/*
helpers for creating modals / popovers

To use, create a svelte file for your new modal with this basic structure:

    <svelte:options accessors/>
    <script>
    import Modal from './modal.svelte';
    /script>

    <Modal>
        <your html here>
    </Modal>

Optionally, the Modal tag can have a 'close' attribute that tells how it can be closed (by default, all MODAL_* are accepted):
    <Modal close={MODAL_OK|MODAL_CANCEL}...
The value of the attribute can also be a function that takes a closeCode param; it should return true to allow the close to proceed.

Note the 2 <script> sections here - this one is module-level (shared) stuff, the other is for subclasses (the actual modals themselves)

Ordinary modals are typically centered, they dim the background when shown, and have some window-like features such as a title bar. Popover
modals, however, do not dim the background, are positioned relative to some element on the screen, and have no UI provided by this module
at all (i.e. the subclass has to provide all the UI). To make a modal be a popover, pass 'pos' in the props when calling OpenModal (see
OpenModal). You will almost always then want to have some inner element that provides the UI, e.g.
    <Modal>
        <inner> <-- apply border / background styles to this
            <your html here>
        </inner>
    </Modal>
*/
import { tick } from 'svelte';

let openModals = []; // stack of open modals: {.modal - modal comp, .resolve - Promise.resolve}
let targetEl; // DOM element into which new modals are appended

// called by App to tell us where to put modal DOM elements
export function Init(_targetEl)
{
    targetEl = _targetEl;
}

// global bit flags to pass to CloseModal, indicating how the modal is being closed
window.MODAL_OK = 1; // normal close
window.MODAL_ESCAPE = 2;
window.MODAL_OVERLAY = 4;
window.MODAL_CANCEL = 8;

// creates an instance of the given modal component and displays it over everything else.
// Returns a Promise that resolves like ({closeCode, comp}) (NOTE THE SYNTAX - a single obj param!!), where
// closeCode is one of the window.MODAL_* codes. If events is provided, it is a mapping of event names to handlers
// for events emitted by the modal component. Note that OpenModal/CloseModal are attached to the window object so
// that they are available globally and don't need to be imported. Some special props values you can pass in are:
// - pos: an [x,y] tuple of pixel values for the left,top of the modal
window.OpenModal = function(comp, props={}, events={})
{
    // we need to immediately push an entry onto the stack because the new modal's onMount will try to
    // write to it
    let entry = {pos:props.pos};
    delete props.pos;
    openModals.push(entry);

    let modal = new comp({target:targetEl, props});
    entry.modal = modal;
    for (let [eventName, cb] of Object.entries(events))
        modal.$on(eventName, cb);

    return new Promise((resolve, reject) => entry.resolve = resolve);
}

// attempts to close the top-most open modal. Typically the modal will close, but modals can override to
// prevent the user from dismissing a modal unless they make a choice.
window.CloseModal = async function(closeCode=MODAL_OK)
{
    if (!openModals.length)
        return;

    // special case, we allow CloseModal to be used in a button like <button on:click={CloseModal}> but in that case
    // we will be passed an event parameter, so detect that case
    if (closeCode instanceof PointerEvent)
        closeCode = MODAL_OK;

    // first see if closing is allowed via this code
    let entry = openModals[openModals.length-1];
    if (entry.close instanceof Function)
    {   // modal provided a callback function, and it is not letting us close
        if (!entry.close(closeCode))
            return;
    }
    else if (!(entry.close & closeCode))
    {   // modal provided a set of flags of allowed close codes, and this one isn't in there
        return;
    }

    openModals.pop(); // consume it
    entry.resolve({closeCode, comp:entry.modal});
    await tick(); // give the resolve a chance to run before we destroy the modal, otherwise the caller can't access any out props on the modal comp
    entry.modal.$destroy();
}

// modals can export a single-argument 'Update' function that can be called while the modal is
// open. This global API is how to call it without having a reference to the currently open modal.
// Returns the return value of the Update function, if any.
window.UpdateModal = function(args)
{
    if (!openModals.length)
        return;
    let modal = openModals[openModals.length-1].modal;
    if (!modal.Update || !(modal.Update instanceof Function))
    {
        console.log('ERROR: cannot update current modal');
        return
    }
    return modal.Update(args);
}

</script>

<script>
import { onMount } from 'svelte';

export let close = MODAL_OK|MODAL_ESCAPE|MODAL_OVERLAY|MODAL_CANCEL; // if not specified, any action can close the modal

export let style = ''; // manual style configuration

// sizing properties: if not set, will fall back to what's in modals.css, probably.
export let minWidth=null, width=null, maxWidth=null, minHeight=null, height=null, maxHeight=null;

let top=null, left=null;
let winW, winH;
let isPopover = false;
let modalEl;

// store the close condition (i.e. the <Modal close={}> attribute value so CloseModal can check to see
// if a modal closing attempt should be allowed.
onMount(() =>
{
    let m = openModals[openModals.length-1];
    m.close = close;
    isPopover = false;
    if (m.pos)
    {
        left = m.pos[0];
        top = m.pos[1];
        isPopover = true;

        // adjust left/top so that the entire menu is onscreen, at least initially
        let modalRect = modalEl.getBoundingClientRect();
        left = Math.min(winW-modalRect.width, left);
        top = Math.min(winH-modalRect.height, top);
    }
});

function Ignore() {}

function OnPositionerClicked(e)
{
    e.preventDefault();
    CloseModal(MODAL_OVERLAY);
}

function OnKeyDown(e)
{
    if (e.key == 'Escape')
        CloseModal(MODAL_ESCAPE);
}

</script>

<svelte:window on:keydown={OnKeyDown} bind:outerWidth={winW} bind:outerHeight={winH} />
<overlay class:isPopover on:click|stopPropagation={OnPositionerClicked} on:contextmenu|stopPropagation={OnPositionerClicked}>
    <positioner>
        <inputcatcher on:click|stopPropagation={Ignore} on:contextmenu|stopPropagation={Ignore}>
        <modal bind:this={modalEl} class:isPopover style="{style};
            {left != null ? `left:${left}px;` : ''}
            {top != null ? `top:${top}px;` : ''}
            {minWidth != null ? 'min-width:'+minWidth+';' : ''}
            {width != null ? 'width:'+width+';' : ''}
            {maxWidth != null ? 'max-width:'+maxWidth+';' : ''}
            {minHeight != null ? 'min-height:'+minHeight+';' : ''}
            {height != null ? 'height:'+height+';' : ''}
            {maxHeight != null ? 'max-height:'+maxHeight+';' : ''}
        ">
                <slot></slot>
            </modal>
        </inputcatcher>
    </positioner>
</overlay>

<style>
overlay, .overlay {
    background-color: #bdbdbd99;
    z-index:300;
    width:100%;
    height:100%;
    position:absolute;
    display: grid;
    padding: 20px;
    overflow:hidden; 
    margin:0; 
    padding:0; 
    align-items: center; 
    justify-content: center;
    top:0;
    left:0;
}

overlay.isPopover {
    background-color:transparent;
}

positioner {
    justify-content: center;
    align-content: center;
    top: 50%;
    bottom: 50%;
    left: 50%;
    right: 50%;
    display: grid;
    height: 100%;
}

modal  {
    box-shadow: 0px 0px 45px 0px rgba(1,1,1,0.5);
    background-color: #fff;
    padding: 0;
    border:solid 1px #3703a7;
    z-index:1001;
    max-width: calc(100vw - 160px);
    margin: auto;
    position: relative;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 15px 30px;
}

modal.isPopover {
    position:absolute;
    background-color:transparent;
    padding:0;
    margin:0;
    border:none;
    overflow:visible;
}

</style>

