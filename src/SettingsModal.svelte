<svelte:options accessors/>
<script>
import Modal from './modal.svelte';
import * as C from './common' 
export let size = null; // info on the unit the user wants to spawn
let height = C.GRID_H;
let width = C.GRID_W;
let new_height = 0;
let new_width = 0;

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
        <p>Current size: {height}/{width}</p>
        <p>
            Height: <input type="text" bind:value={new_height} />
            width: <input type="text" bind:value={new_width} />
        </p>
    </content>
    <div class="buttons">
        <button class="btn-secondary" on:click={Cancel}>Cancel</button>
        <button class="btn-secondary" on:click={Add}>Resize</button>
    </div>
</Modal>