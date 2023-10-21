<script lang="ts">
  import Document from './lib/components/Document.svelte'
  import Dropzone from './lib/components/Dropzone.svelte'
  import { PDFLibDoc } from './lib/stores'
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
