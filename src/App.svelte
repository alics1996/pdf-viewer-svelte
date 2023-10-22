<script lang="ts">
  import Document from '$lib/Document.svelte'
  import Dropzone from '$lib/Dropzone.svelte'
  import { PDFLibDoc } from '$utils/stores'
</script>

<main>
  {#if $PDFLibDoc}
    <Document />
  {:else}
    <Dropzone />
  {/if}
</main>

<style>
</style>
