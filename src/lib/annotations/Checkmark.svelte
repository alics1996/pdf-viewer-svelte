<script lang="ts">
  import { onMount } from 'svelte'
  import type { CheckMarkAnnot } from '$annotations/classes'
  import { attachMouseMoveListener } from '$utils/util'
  import {
    AnnotColor,
    PreventHover,
    SelectedTool,
    StoredAnnotations,
  } from '$utils/stores'

  export let annotObj: CheckMarkAnnot
  const minWidth = 15

  $: annotPos = annotObj.annotPos
  $: annotSize = annotPos.size
  $: strokeWidth = [annotSize] && annotObj.opts.strokeWidth
  $: offset = strokeWidth * 1.5

  $: checkmarkPath =
    `M 0,${annotSize.height / 2} ` +
    `L ${annotSize.width / 3},${annotSize.height} ` +
    `L ${annotSize.width},0`

  let annotRef: SVGElement
  let annotIsFocused = false

  let annotHovered = false

  onMount(() => {
    annotObj.opts.color = $AnnotColor

    annotPos.start.x -= minWidth / 2
    annotPos.start.y += minWidth / 2
    annotPos.end.x = annotPos.start.x + minWidth
    annotPos.end.y = annotPos.start.y - minWidth
  })

  $: if (annotRef) {
    annotRef.style.left = `${annotPos.start.x}px`
    annotRef.style.bottom = `${annotPos.end.y}px`
  }

  function handleResize(e: MouseEvent) {
    e.stopPropagation()

    const end = annotObj.getCoords(e)
    end.x -= offset
    end.y += offset

    const start = annotPos.start

    const width = end.x - start.x
    const height = start.y - end.y

    if (width <= 0 && height <= 0) return

    const maxVal = Math.max(width, height, minWidth)
    annotPos.end = {
      x: start.x + maxVal,
      y: start.y - maxVal,
    }
  }
  function moveAnnotHandler(
    e: MouseEvent & { currentTarget: EventTarget & SVGElement },
  ) {
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
  class="checkmark-annot"
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
  <!-- checkmark path -->
  <path
    d={checkmarkPath}
    stroke={annotObj.opts.color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    fill="none"
  />

  {#if $SelectedTool === ''}
    <!-- hover elem -->
    <rect
      x={-offset}
      y={-offset}
      rx="3"
      width={annotSize.width + offset * 2}
      height={annotSize.height + offset * 2}
      fill="transparent"
      stroke={annotIsFocused ? '#a0a0a0' : annotHovered ? '#d3d3d3' : 'none'}
      stroke-width="1"
    />
    <!-- move controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="move-annot"
      cx={annotSize.width / 2}
      cy={annotSize.height / 2}
      r={(annotSize.width + offset) / 2}
      on:mousedown={moveAnnotHandler}
    />
  {/if}

  {#if $SelectedTool === '' && annotIsFocused}
    <!-- move se -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx={annotSize.width + offset}
      cy={annotSize.height + offset}
      r={4}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleResize, 'pointer')
      }}
    />
  {/if}
</svg>

<style lang="scss">
  .checkmark-annot {
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
