<svelte:options accessors/>
<script>
// modal for spawning a unit on a tile. If the user doesn't cancel, the exported prop 'unit' will be non-null
// and an object with .name (a unique display name), .ac (armor class), .health, .imageName properties
import Modal from './modal.svelte';
import * as C from './common.js';
export let unit = null; // info on the unit the user wants to spawn

function Cancel()
{
    CloseModal(MODAL_CANCEL);
}

let curIndex = 0;
let cur = C.UNITS[0];
let ac = cur.ac;
let health = cur.health;
let movement = cur.movement || 0;
function OnSelected()
{
    cur = C.UNITS[curIndex];
    ac = cur.ac;
    health = cur.health;
    movement = cur.movement || 0;
}

function Add()
{
    unit = {name:cur.name, ac, health, imageName:cur.imageName, movement};
    CloseModal(MODAL_OK);
}

</script>

<Modal>
    <h1>Add unit to tile</h1>
    <content>
        <select bind:value={curIndex} on:change={OnSelected}>
        {#each C.UNITS as entry, i}
            <option value={i}>
                {entry.name}
            </option>
        {/each}
        </select>
        <imageHolder>
            <img src={C.imageCache[cur.imageName].url}/>
        </imageHolder>
        <p>
            AC: <input type="text" bind:value={ac} />
            Health: <input type="text" bind:value={health} />
            Movement: <input type="text" bind:value={movement} />
        </p>
    </content>
    <div class="buttons">
        <button class="btn-secondary" on:click={Cancel}>Cancel</button>
        <button class="btn-secondary" on:click={Add}>Spawn this unit</button>
    </div>
</Modal>

<style>
imageHolder
{
    display:inline-block;
    background-color:black;
}
</style>

