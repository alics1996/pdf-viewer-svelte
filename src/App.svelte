<script lang="ts">
  import Document from '$lib/Document.svelte'
  import Dropzone from '$lib/Dropzone.svelte'
  import { PDFLibDoc } from '$utils/stores'
  import { isCmd } from './lib/utils/util'

  function callback(e: KeyboardEvent) {
    if (isCmd(e) && e.code === 'Equal') {
      e.preventDefault()
    }
    if (isCmd(e) && e.code === 'Minus') {
      e.preventDefault()
    }
  }
</script>

<main>
  {#if $PDFLibDoc}
    <Document />
  {:else}
    <Dropzone />
  {/if}
</main>

<svelte:window on:keydown={callback} />

<style>
</style>
