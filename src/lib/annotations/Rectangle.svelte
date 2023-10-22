<script lang="ts">
  import { onMount } from 'svelte'

  import type { SquareAnnot } from '$annotations/classes'
  import {
    AnnotColor,
    PreventHover,
    SelectedTool,
    StoredAnnotations,
  } from '$utils/stores'
  import { attachMouseMoveListener } from '$utils/util'

  export let annotObj: SquareAnnot
  // annotObj.opts.strokeWidth = Math.floor(Math.random() * (10 - 2 + 1) + 2)

  $: annotPos = annotObj.annotPos
  $: annotSize = annotPos.size
  $: strokeWidth = annotObj.opts.strokeWidth

  let annotRef: SVGElement
  let annotIsFocused = false
  let annotHovered = false

  onMount(() => {
    annotObj.opts.color = $AnnotColor
    attachMouseMoveListener(handleSeResize)
  })

  $: if (annotRef) {
    annotRef.style.left = `${Math.min(annotPos.start.x, annotPos.end.x)}px`
    annotRef.style.bottom = `${Math.min(annotPos.start.y, annotPos.end.y)}px`

    const { scaleX, scaleY } = annotPos.transform
    annotRef.style.transform = `scale(${scaleX},${scaleY})`
  }

  function handleNeResize(e: MouseEvent) {
    e.stopPropagation()
    const { x, y } = annotObj.getCoords(e)
    ;(annotPos.end.x = x), (annotPos.start.y = y)
  }
  function handleNwResize(e: MouseEvent) {
    e.stopPropagation()
    annotPos.start = annotObj.getCoords(e)
  }
  function handleSeResize(e: MouseEvent) {
    e.stopPropagation()
    annotPos.end = annotObj.getCoords(e)
  }
  function handleSwResize(e: MouseEvent) {
    e.stopPropagation()
    const { x, y } = annotObj.getCoords(e)
    ;(annotPos.start.x = x), (annotPos.end.y = y)
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

  const moveRect = {
    margin: 0,
    vizRect: 0.8,
    min: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }
  $: moveRect.margin = 3 + strokeWidth * 2
  $: moveRect.min = moveRect.margin / ((1 - moveRect.vizRect) / 2)

  $: if (annotSize.width > moveRect.min) {
    moveRect.x = moveRect.margin
    moveRect.width = annotSize.width - moveRect.margin * 2
  } else {
    moveRect.x = (annotSize.width * (1 - moveRect.vizRect)) / 2
    moveRect.width = annotSize.width * moveRect.vizRect
  }

  $: if (annotSize.height > moveRect.min) {
    moveRect.y = moveRect.margin
    moveRect.height = annotSize.height - moveRect.margin * 2
  } else {
    moveRect.y = (annotSize.height * (1 - moveRect.vizRect)) / 2
    moveRect.height = annotSize.height * moveRect.vizRect
  }
</script>

<svg
  class="rect-annot"
  role="button"
  tabindex="0"
  width={annotSize.width}
  height={annotSize.height}
  bind:this={annotRef}
  on:focusin={() => (annotIsFocused = true)}
  on:focusout={() => (annotIsFocused = false)}
  on:mouseenter={() => {
    if ($PreventHover) return
    annotHovered = true
  }}
  on:mouseleave={() => (annotHovered = false)}
  on:keydown={handleKeyDown}
>
  <!-- rect path -->
  <rect
    width={annotSize.width || 0.1}
    height={annotSize.height || 0.1}
    stroke={annotObj.opts.color}
    stroke-width={strokeWidth}
    fill={annotObj.opts.fillColor}
  />

  {#if $SelectedTool === ''}
    <!-- hover elem -->
    <rect
      x={-(5 + strokeWidth / 2)}
      y={-(5 + strokeWidth / 2)}
      rx="3"
      width={annotSize.width + (5 + strokeWidth / 2) * 2}
      height={annotSize.height + (5 + strokeWidth / 2) * 2}
      fill="transparent"
      stroke={annotIsFocused ? '#a0a0a0' : annotHovered ? '#d3d3d3' : 'none'}
      stroke-width="1"
    />
    <!-- move controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <rect
      class="move-annot"
      x={moveRect.x}
      y={moveRect.y}
      rx="3"
      width={moveRect.width}
      height={moveRect.height}
      on:mousedown={moveAnnotHandler}
    />
  {/if}

  {#if $SelectedTool === '' && annotIsFocused}
    <!-- move ne -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx={annotSize.width}
      cy="0"
      r={3.5}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleNeResize, 'pointer')
      }}
    />
    <!-- move nw -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx="0"
      cy="0"
      r={3.5}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleNwResize, 'pointer')
      }}
    />
    <!-- move se -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx={annotSize.width}
      cy={annotSize.height}
      r={3.5}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleSeResize, 'pointer')
      }}
    />
    <!-- move sw -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx="0"
      cy={annotSize.height}
      r={3.5}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleSwResize, 'pointer')
      }}
    />
  {/if}
</svg>

<style lang="scss">
  .rect-annot {
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
    stroke-width: 1;
    cursor: pointer;
    z-index: 20;
  }
</style>
