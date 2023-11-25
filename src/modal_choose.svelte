<svelte:options accessors/>
<script>
// a reusable model for presenting multiple options to a user to choose from
// used via the ChooseModal function from App.svelte
import Modal from './modal.svelte';
import { onMount } from 'svelte';
export let choseIndex = -1;
export let title = 'Choose';
export let body = 'Select an option';
export let nonCancelButtonLabels = ['Ok'];
export let addCancelButton = true;

let labels = [];
onMount(() =>
{
    labels = [...nonCancelButtonLabels];
    if (addCancelButton)
        labels.push('Cancel');
});

function Go(i)
{
    // if they hit the cancel button, treat it the same as all other cancels
    if (addCancelButton && i == labels.length-1)
        choseIndex = -1;
    else
        choseIndex = i;
    CloseModal(MODAL_OK);
}

</script>

<Modal>
    <h1>{title}</h1>
    <content>
        <p>{@html body}</p>
    </content>
    <div class="buttons">
        {#each labels as label, i}
            <button class="btn-{i==0 || i<labels.length-1 ? "primary":"secondary"}" on:click={()=>Go(i)}>{label}</button>
        {/each}
    </div>
</Modal>


