<svelte:options accessors/>
<script>
import Modal from './modal.svelte';
import * as C from './common' 
export let curW, curH; // IN: the current board dimensions
export let size = null; // info on the unit the user wants to spawn
let new_height = curH;
let new_width = curW;

const MIN_SIZE = 0;
const MAX_SIZE = 10000;

let valid = false;
$: valid = new_height * new_width > MIN_SIZE && 
            new_height * new_width <= MAX_SIZE &&
            (new_height !== curH || new_width !== curW);

let warning = '';
$: warning = new_height * new_width < curH * curW  && valid ? 'Warning: New size will be smaller than current size' : '';

let warning_big = '';
$: warning_big = new_height * new_width > MAX_SIZE ? `Size w*h must be <= ${MAX_SIZE} (would be: ${new_height * new_width})` : '';


function Cancel()
{
    CloseModal(MODAL_CANCEL);
}

function Add()
{
    size = {height:new_height, width:new_width}
    CloseModal(MODAL_OK);
}
</script>

<Modal>
    <h1>Resize Grid</h1>
    <content>
        <p>Current size: {curW}x{curH}</p>
        <p>
            Height: <input type="int" bind:value={new_height} />
            width: <input type="int" bind:value={new_width} />
        </p>
    </content>
    {#if warning}
        <p style="color: red;">{warning}</p>
    {/if}
    {#if warning_big}
        <p style="color: red;">{warning_big}</p>
    {/if}
    <div class="buttons">
        <button class="btn-secondary" on:click={Cancel}>Cancel</button>
        <button disabled={!valid} class="btn-secondary" on:click={Add}>Resize</button>


    </div>
</Modal>
