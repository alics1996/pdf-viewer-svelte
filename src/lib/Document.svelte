<script lang="ts">
  import { onMount } from 'svelte'

  import {
    IntObserver,
    PDFLibPages,
    PreventHover,
    SelectedTool,
  } from '$utils/stores'

  import Page from '$lib/Page.svelte'
  import Toolbar from '$lib/Toolbar.svelte'

  import 'pdfjs-dist/web/pdf_viewer.css'
  import SecondaryToolbar from './SecondaryToolbar.svelte'

  let pdfViewerDiv: HTMLElement
  let pageViewNum = 1

  $: [$SelectedTool] && updateCursorStyles()

  const styles = document.createElement('style')
  styles.innerHTML =
    '.page-container, .page-container * { cursor: crosshair !important; }\n' +
    '.textLayer { display: none; }'

  function updateCursorStyles() {
    if ($SelectedTool !== '') {
      window.getSelection()?.removeAllRanges()
      ;(document.activeElement as HTMLElement | undefined)?.blur()

      document.head.append(styles)
      PreventHover.set(true)
    } else {
      styles.remove()
      PreventHover.set(false)
    }
  }

  onMount(() => {
    $IntObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries.filter((entry) => entry.isIntersecting).at(-1)
        if (!entry) return

        const idx = $PDFLibPages.findIndex(
          (item) => item.pageDiv === entry.target,
        )
        pageViewNum = idx !== -1 ? idx + 1 : pageViewNum
      },
      {
        root: pdfViewerDiv,
        rootMargin: '-50% 0px',
        threshold: 0,
      },
    )
  })
</script>

<div class="pdf-viewer-container">
  <Toolbar {pageViewNum} />
  <SecondaryToolbar />
  <section class="pdf-pages-container" bind:this={pdfViewerDiv}>
    {#if $IntObserver}
      {#each $PDFLibPages as item (item.id)}
        <Page pdfLibPageStore={item} />
      {/each}
    {/if}
  </section>
</div>

<style>
  .pdf-viewer-container {
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: center;
    height: 100vh;
  }
  .pdf-pages-container {
    width: 100vw;
    overflow: auto;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    background-color: #ebebeb;
  }
</style>
