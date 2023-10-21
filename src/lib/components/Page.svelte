<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import PageContextMenu from "$components/PageContextMenu.svelte";

  import { renderTextLayer } from "pdfjs-dist";
  import { getPDFJsDocument } from "$lib/pdf_utils";

  import {
    IntObserver,
    PDFLibDoc,
    PDFLibPages,
    SelectedTool,
    StoredAnnotations,
    deletePage,
    insertPage,
  } from "$lib/stores";

  import {
    AnnotPos,
    ArrowAnnot,
    CheckMarkAnnot,
    ImageAnnot,
    SquareAnnot,
  } from "$annotations/classes";
  import SquareAnnotation from "$annotations/Rectangle.svelte";
  import ArrowAnnotation from "$annotations/Arrow.svelte";
  import CheckMarkAnnotation from "$annotations/Checkmark.svelte";
  import ImageAnnotation from "$annotations/Image.svelte";
  import { canvasCtxNotSupportedError } from "$lib/util";

  let pageContextMenu: PageContextMenu;

  export let pdfLibPageStore: (typeof $PDFLibPages)[number];

  $: pageId = pdfLibPageStore.id;
  $: pageObj = pdfLibPageStore.pageObj;

  $: pageSize = pageObj.getSize();
  $: pageIdx = $PDFLibPages.findIndex((item) => item.id === pageId);
  $: pageAnnots = $StoredAnnotations.filter((item) => item.pageId === pageId);

  const scale = 1.2;

  let pageDiv: HTMLElement;
  let canvasRef: HTMLCanvasElement;
  let textLayerRef: HTMLDivElement;
  let annotLayerRef: HTMLDivElement;

  let isMounted = false;

  onMount(async () => {
    isMounted = true;

    $IntObserver.observe(pageDiv);
    pdfLibPageStore.pageDiv = pageDiv;

    const { width, height } = pageObj.getSize();
    annotLayerRef.style.width = `calc(var(--scale-factor) * ${width}px)`;
    annotLayerRef.style.height = `calc(var(--scale-factor) * ${height}px)`;

    textLayerRef.innerHTML = "";
    renderPage();
  });

  onDestroy(() => {
    $IntObserver.unobserve(pageDiv);
    $StoredAnnotations = $StoredAnnotations.filter(
      (item) => item.pageId !== pageId
    );
  });

  $: [$SelectedTool] && updateCursor();
  function updateCursor() {
    if (!isMounted) return;

    switch ($SelectedTool) {
      case "square":
      case "arrow":
      case "checkmark":
      case "signature":
        window.getSelection()?.removeAllRanges();
        (document.activeElement as HTMLElement | SVGElement)?.blur();

        textLayerRef.style.display = "none";
        pageDiv.style.cursor = "crosshair";
        break;
      default:
        textLayerRef.style.display = "";
        pageDiv.style.cursor = "";
        break;
    }
  }

  async function renderPage() {
    const pdfJsDoc = await getPDFJsDocument($PDFLibDoc!);
    const pdfJsPage = await pdfJsDoc.getPage(pageIdx + 1);

    const viewport = pdfJsPage.getViewport({ scale });

    canvasRef.width = viewport.width;
    canvasRef.height = viewport.height;

    const canvasContext = canvasRef.getContext("2d");
    if (!canvasContext) {
      throw canvasCtxNotSupportedError;
    }

    const renderContext = { canvasContext, viewport };
    await pdfJsPage.render(renderContext).promise;

    const textContent = await pdfJsPage.getTextContent();

    await renderTextLayer({
      textContentSource: textContent,
      container: textLayerRef,
      viewport: viewport,
    }).promise;
  }

  function handleMouseDown(event: MouseEvent) {
    if (!$SelectedTool || event.button !== 0) return;
    event.preventDefault();

    const boundingRect = pageDiv.getBoundingClientRect();
    const annotPos = new AnnotPos();

    annotPos.ratio = {
      x: pageSize.width / pageDiv.clientWidth,
      y: pageSize.height / pageDiv.clientHeight,
    };
    annotPos.start = {
      x: event.clientX - boundingRect.left,
      y: boundingRect.height - (event.clientY - boundingRect.top),
    };
    annotPos.end = { x: annotPos.start.x, y: annotPos.start.y };

    switch ($SelectedTool) {
      case "square":
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new SquareAnnot(pageId, annotPos, pageDiv));
          return annotsArr;
        });
        break;
      case "arrow":
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new ArrowAnnot(pageId, annotPos, pageDiv));
          return annotsArr;
        });
        break;
      case "checkmark":
        StoredAnnotations.update((annotsArr) => {
          annotsArr.push(new CheckMarkAnnot(pageId, annotPos, pageDiv));
          return annotsArr;
        });
        break;
      case "signature":
        const image = new Image();
        image.crossOrigin = "anonymous";

        new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject();

          image.src = "./images/signature.png";
        })
          .then(() => {
            StoredAnnotations.update((annotsArr) => {
              annotsArr.push(new ImageAnnot(pageId, annotPos, pageDiv, image));
              return annotsArr;
            });
          })
          .catch(() => {});
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="page-container"
  style={`--scale-factor: ${scale}`}
  on:contextmenu|preventDefault|stopPropagation={(e) => {
    if ($SelectedTool) {
      if (e.button === 2) SelectedTool.set("");
      return;
    }
    pageContextMenu.rightClickContextMenu(e);
  }}
  on:mousedown|stopPropagation={handleMouseDown}
  bind:this={pageDiv}
>
  <div class="annotLayer" bind:this={annotLayerRef}>
    {#each pageAnnots as item (item.id)}
      {#if item instanceof SquareAnnot}
        <SquareAnnotation annotObj={item} />
      {:else if item instanceof ArrowAnnot}
        <ArrowAnnotation annotObj={item} />
      {:else if item instanceof CheckMarkAnnot}
        <CheckMarkAnnotation annotObj={item} />
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
    z-index: 5;
  }
</style>
