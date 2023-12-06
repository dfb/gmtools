<svelte:options accessors/>
<script>
// modal the user sees when they first show up or when they close a board and want to open/create one
import { onMount } from 'svelte';
import Modal from './modal.svelte';
import * as DB from './db.js';
import * as C from './common.js';
export let board = null; // the board to use - either the one the user selected OR a newly created board

let boards = [];
let newW=10, newH=10, newName='';
$:createReady = newW > 0 && newW < 50 && newH > 0 && newH < 50 && newName.length > 0 && newName.length < 100;

function RefreshBoardList()
{
    boards = [];
    DB.ListBoards().then(_boards => boards = _boards);
}
onMount(RefreshBoardList);

function Load(boardID)
{
    DB.LoadBoard(boardID).then(b =>
    {
        board = b;
        CloseModal(MODAL_OK);
    });
}

function Create()
{
    DB.CreateBoard(newName, newW, newH).then(b =>
    {
        board = b;
        CloseModal(MODAL_OK);
    });
}

function ConfirmDelete(board)
{
    ConfirmModal(`Are you sure you want to delete ${board.name}?`, 'Really delete board?').then(()=>
    {
        DB.DeleteBoard(board.id).then(RefreshBoardList);
    });
}

</script>

<Modal close={MODAL_OK}>
    <h1>Create {#if boards.length}or open{/if} a board</h1>
    <content>
    {#if boards.length}
        Click to open an existing board:
        <ul>
        {#each boards as b}
            <li on:click={()=>Load(b.id)}>
                <span>{b.name}</span>
                <button on:click|stopPropagation={()=>ConfirmDelete(b)}>X</button>
            </li>
        {/each}
        </ul>
    {/if}

        <br/>
        Create a new board:
        <p>Name: <input type="text" bind:value={newName}/></p>
        <p>
            Width: <input class="dim" bind:value={newW} type="number"/>
            Height: <input class="dim" bind:value={newH} type="number"/>
        </p>
        <button on:click={Create} disabled={!createReady}>Create</button>
    </content>
</Modal>

<style>
ul {
    margin:0;
    padding:0;
}

li {
    cursor:pointer;
    border: solid black 1px;
    padding:10px;
    margin-bottom:3px;
    background-color:#ccccff;
    list-style:none;
    display:flex;
}

li span {
    flex-grow:1;
}

li button {
}

input.dim {
    width:3em;
}
</style>

