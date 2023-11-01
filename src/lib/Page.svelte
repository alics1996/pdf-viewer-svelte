<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import PageContextMenu from '$lib/PageContextMenu.svelte'

  import { renderTextLayer } from 'pdfjs-dist'
  import { getPDFJsDocument } from '$utils/pdf_utils'

  import {
    IntObserver,
    PDFLibDoc,
    PDFLibPages,
    SelectedTool,
    StoredAnnotations,
    deletePage,
    insertPage,
  } from '$utils/stores'

  import {
    AnnotPos,
    ArrowAnnot,
    CheckMarkAnnot,
    ImageAnnot,
    SquareAnnot,
  } from '$annotations/classes'

  import {
    ArrowAnnotation,
    CheckmarkAnnotation,
    RectangleAnnotation,
    ImageAnnotation,
  } from '$annotations/index'

  import {
    canvasCtxNotSupportedError,
    getImageFromSrc,
    isString,
    readInput,
    unexpectedReturnTypeError,
  } from '$utils/util'

  let pageContextMenu: PageContextMenu

  export let pdfLibPageStore: (typeof $PDFLibPages)[number]

  $: pageId = pdfLibPageStore.id
  $: pageObj = pdfLibPageStore.pageObj

  $: pageSize = pageObj.getSize()
  $: pageIdx = $PDFLibPages.findIndex((item) => item.id === pageId)
  $: pageAnnots = $StoredAnnotations.filter((item) => item.pageId === pageId)

  const scale = 1.2

  let pageDiv: HTMLElement
  let canvasRef: HTMLCanvasElement
  let textLayerRef: HTMLDivElement
  let annotLayerRef: HTMLDivElement

  let isMounted = false

  onMount(async () => {
    isMounted = true

    $IntObserver.observe(pageDiv)
    pdfLibPageStore.pageDiv = pageDiv

    const { width, height } = pageObj.getSize()
    annotLayerRef.style.width = `calc(var(--scale-factor) * ${width}px)`
    annotLayerRef.style.height = `calc(var(--scale-factor) * ${height}px)`

    textLayerRef.innerHTML = ''
    renderPage()
  })

  onDestroy(() => {
    $IntObserver.unobserve(pageDiv)
    $StoredAnnotations = $StoredAnnotations.filter(
      (item) => item.pageId !== pageId,
    )
  })

  async function renderPage() {
    const pdfJsDoc = await getPDFJsDocument($PDFLibDoc!)
    const pdfJsPage = await pdfJsDoc.getPage(pageIdx + 1)

    const viewport = pdfJsPage.getViewport({ scale })

    canvasRef.width = viewport.width
    canvasRef.height = viewport.height

    const canvasContext = canvasRef.getContext('2d')
    if (!canvasContext) {
      throw canvasCtxNotSupportedError
    }

    const renderContext = { canvasContext, viewport }
    await pdfJsPage.render(renderContext).promise

    const textContent = await pdfJsPage.getTextContent()

    await renderTextLayer({
      textContentSource: textContent,
      container: textLayerRef,
      viewport: viewport,
    }).promise
  }

  async function handleMouseDown(event: MouseEvent) {
    if (!$SelectedTool || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const boundingRect = pageDiv.getBoundingClientRect()
    const annotPos = new AnnotPos()

    annotPos.ratio = {
      x: pageSize.width / pageDiv.clientWidth,
      y: pageSize.height / pageDiv.clientHeight,
    }
    annotPos.start = {
      x: event.clientX - boundingRect.left,
      y: boundingRect.height - (event.clientY - boundingRect.top),
    }
    annotPos.end = { x: annotPos.start.x, y: annotPos.start.y }

    switch ($SelectedTool) {
      case 'square': {
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new SquareAnnot(pageId, annotPos, pageDiv))
          return annotsArr
        })
        break
      }
      case 'arrow': {
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new ArrowAnnot(pageId, annotPos, pageDiv))
          return annotsArr
        })
        break
      }
      case 'checkmark': {
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new CheckMarkAnnot(pageId, annotPos, pageDiv))
          return annotsArr
        })
        break
      }
      case 'signature': {
        try {
          const img = await getImageFromSrc('./signature.png')
          StoredAnnotations.update((annotsArr) => {
            annotsArr.push(new ImageAnnot(pageId, annotPos, pageDiv, img))
            return annotsArr
          })
        } catch (error) {
          console.warn(error)
        }
        break
      }
      case 'image': {
        try {
          const filesData = await readInput(
            { accept: 'image/*', multiple: false },
            'readAsDataURL',
          )
          const urlString = filesData.at(0)?.data
          if (!isString(urlString)) {
            throw unexpectedReturnTypeError(urlString, 'readInput', 'string')
          }
          const img = await getImageFromSrc(urlString as string)
          StoredAnnotations.update((annotsArr) => {
            annotsArr.push(new ImageAnnot(pageId, annotPos, pageDiv, img))
            return annotsArr
          })
        } catch (error) {
          console.warn(error)
        }
        break
      }
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="page-container"
  style={`--scale-factor: ${scale}`}
  on:contextmenu|preventDefault|stopPropagation={(e) => {
    if ($SelectedTool) {
      if (e.button === 2) SelectedTool.set('')
      return
    }
    pageContextMenu.rightClickContextMenu(e)
  }}
  on:mousedown={handleMouseDown}
  bind:this={pageDiv}
>
  <div class="annotLayer" bind:this={annotLayerRef}>
    {#each pageAnnots as item (item.id)}
      {#if item instanceof SquareAnnot}
        <RectangleAnnotation annotObj={item} />
      {:else if item instanceof ArrowAnnot}
        <ArrowAnnotation annotObj={item} />
      {:else if item instanceof CheckMarkAnnot}
        <CheckmarkAnnotation annotObj={item} />
      {:else if item instanceof ImageAnnot}
        <ImageAnnotation annotObj={item} />
      {/if}
    {/each}
  </div>
  <div class="textLayer" bind:this={textLayerRef} />
  <canvas bind:this={canvasRef} />

  <PageContextMenu
    deletePage={() => deletePage(pageIdx)}
    insertPage={() => insertPage(pageIdx)}
    bind:this={pageContextMenu}
  />
</div>

<style>
  .page-container {
    position: relative;
    scroll-margin-top: 10px;
    width: fit-content;
    margin-bottom: 10px;
  }
  canvas {
    display: block;
  }
  .annotLayer {
    position: absolute;
    overflow: hidden;
  }
  /* make annot obj be on top of text layer, but text layer should be */
  /* above the annot layer div, otherwise text is not selectable */
  .annotLayer :global(.annotation-object) {
    z-index: 10;
  }
</style>
