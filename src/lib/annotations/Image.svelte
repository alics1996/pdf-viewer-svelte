<script lang="ts">
  import { onMount } from 'svelte'
  import type { ImageAnnot } from '$annotations/classes'
  import { attachMouseMoveListener } from '$utils/util'
  import { PreventHover, SelectedTool, StoredAnnotations } from '$utils/stores'

  export let annotObj: ImageAnnot

  $: annotPos = annotObj.annotPos
  $: annotImg = annotObj.image
  $: annotSize = annotPos.size
  $: annotPadding = 4

  let annotRef: SVGElement
  let annotIsFocused = false
  let annotHovered = false

  onMount(() => {
    const imgDims = {
      width: annotImg.width / 1.5,
      height: annotImg.height / 1.5,
    }

    annotPos.start.x -= imgDims.width / 2
    annotPos.start.y += imgDims.height / 2
    annotPos.end.x = annotPos.start.x + imgDims.width
    annotPos.end.y = annotPos.start.y - imgDims.height
  })

  $: if (annotRef) {
    annotRef.style.left = `${annotPos.start.x}px`
    annotRef.style.bottom = `${annotPos.end.y}px`
  }

  function handleMouseDownResize(
    e: MouseEvent & { currentTarget: EventTarget & SVGCircleElement },
  ) {
    if (e.button !== 0) return

    const start = annotPos.start
    const ratio = annotSize.width / annotSize.height

    attachMouseMoveListener(handleResize, 'pointer')

    function handleResize(e: MouseEvent) {
      e.stopPropagation()

      const client = annotObj.getCoords(e)
      client.x -= annotPadding
      client.y += annotPadding

      const newWidth = client.x - start.x
      const newHeight = start.y - client.y

      const supposedWidth = newHeight * ratio
      const supposedHeight = newWidth / ratio

      if (newWidth >= supposedWidth) {
        if (newWidth <= 0 || supposedHeight <= 0) return
      } else {
        if (supposedWidth <= 0 || newHeight <= 0) return
      }

      annotPos.end =
        newWidth >= supposedWidth
          ? { x: start.x + newWidth, y: start.y - supposedHeight }
          : { x: start.x + supposedWidth, y: start.y - newHeight }
    }
  }

  function moveAnnotHandler(e: MouseEvent) {
    if (e.button !== 0) {
      return
    }
    attachMouseMoveListener(handleMoveAnnot, 'grabbing')

    let { x: prevX, y: prevY } = annotObj.getCoords(e)

    function handleMoveAnnot(e: MouseEvent) {
      const { x, y } = annotObj.getCoords(e),
        dx = x - prevX,
        dy = y - prevY
      ;(prevX = x), (prevY = y)
      //
      ;(annotPos.start.x += dx), (annotPos.end.x += dx)
      ;(annotPos.start.y += dy), (annotPos.end.y += dy)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Backspace') {
      $StoredAnnotations = $StoredAnnotations.filter(
        (item) => item !== annotObj,
      )
    }
    if (e.key === 'Escape') {
      ;(document.activeElement as SVGElement).blur()
    }
  }
</script>

<svg
  class="image-annot"
  role="button"
  tabindex="0"
  width={annotSize.width}
  height={annotSize.height}
  bind:this={annotRef}
  on:focusin={() => (annotIsFocused = true)}
  on:focusout={() => (annotIsFocused = false)}
  on:mouseleave={() => (annotHovered = false)}
  on:mouseenter={() => {
    if ($PreventHover) return
    annotHovered = true
  }}
  on:keydown={handleKeyDown}
>
  <!-- image -->
  <image
    x="0"
    y="0"
    width={annotSize.width}
    height={annotSize.height}
    xlink:href={annotObj.base64Img}
  />

  {#if $SelectedTool === ''}
    <!-- hover elem -->
    <rect
      x={-annotPadding}
      y={-annotPadding}
      rx="3"
      width={annotSize.width + annotPadding * 2}
      height={annotSize.height + annotPadding * 2}
      fill="transparent"
      stroke={annotIsFocused ? '#a0a0a0' : annotHovered ? '#d3d3d3' : 'none'}
      stroke-width="1"
    />
    <!-- move controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <rect
      class="move-annot"
      x="0"
      y="0"
      width={annotSize.width}
      height={annotSize.height}
      on:mousedown={moveAnnotHandler}
    />
  {/if}

  {#if $SelectedTool === '' && annotIsFocused}
    <!-- move se -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx={annotSize.width + annotPadding}
      cy={annotSize.height + annotPadding}
      r={4}
      on:mousedown={handleMouseDownResize}
    />
  {/if}
</svg>

<style lang="scss">
  .image-annot {
    position: absolute;
    box-sizing: content-box;
    border: 1px solid transparent;
    overflow: visible;

    &:focus,
    &:focus-within,
    &:focus-visible {
      z-index: 25;
      outline: 0 solid transparent;
      outline-color: transparent;
    }
  }

  .move-annot {
    cursor: grab;
    fill: transparent; // rgba(0, 0, 0, 0.5)
  }

  .resize {
    fill: #0061d1;
    stroke: #fff;
    stroke-width: 2;
    cursor: pointer;
    z-index: 20;
  }
</style>
