<script lang="ts">
  import { onMount } from 'svelte'
  import type { ArrowAnnot } from '$annotations/classes'
  import {
    AnnotColor,
    PreventHover,
    SelectedTool,
    StoredAnnotations,
  } from '$utils/stores'
  import { attachMouseMoveListener } from '$utils/util'

  export let annotObj: ArrowAnnot
  // annotObj.opts.strokeWidth = Math.floor(Math.random() * (10 - 2 + 1) + 2)

  $: annotPos = annotObj.annotPos
  $: arrowTip = [annotPos] && annotObj.arrowTip
  $: annotSize = annotPos.size
  $: strokeWidth = annotObj.opts.strokeWidth
  $: headLength = annotObj.headLength

  $: arrowPath =
    `M 0,0 ` +
    `L ${annotSize.width},${annotSize.height} ` +
    `M ${arrowTip.xLeft},${arrowTip.yLeft} ` +
    `L ${annotSize.width},${annotSize.height} ` +
    `L ${arrowTip.xRight},${arrowTip.yRight}`

  let annotRef: SVGElement
  let annotIsFocused = false
  let annotHovered = false

  onMount(() => {
    annotObj.opts.color = $AnnotColor
    attachMouseMoveListener(handleMovePointer)
  })

  $: if (annotRef) {
    annotRef.style.left = `${Math.min(annotPos.start.x, annotPos.end.x)}px`
    annotRef.style.bottom = `${Math.min(annotPos.start.y, annotPos.end.y)}px`

    const { scaleX, scaleY } = annotPos.transform
    annotRef.style.transform = `scale(${scaleX},${scaleY})`
  }

  $: [$AnnotColor] && updateColor()
  function updateColor() {
    if (!annotIsFocused) return
    annotObj.opts.color = $AnnotColor
  }

  function handleMovePointer(e: MouseEvent) {
    e.stopPropagation()
    annotPos.end = annotObj.getCoords(e)
  }
  function handleMoveOrigin(e: MouseEvent) {
    e.stopPropagation()
    annotPos.start = annotObj.getCoords(e)
  }
  function moveAnnotHandler(e: MouseEvent) {
    if (e.button !== 0) {
      return
    }
    attachMouseMoveListener(handleMoveArrow, 'grabbing')

    let { x: prevX, y: prevY } = annotObj.getCoords(e)

    function handleMoveArrow(e: MouseEvent) {
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
  class="annotation-object arrow"
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
  <!-- arrow path -->
  <path
    d={arrowPath}
    stroke={annotObj.opts.color}
    stroke-width={strokeWidth}
    fill="none"
  />

  {#if $SelectedTool === ''}
    <!-- hover elem -->
    <rect
      x={-headLength / 2}
      y={-headLength / 2}
      rx="3"
      width={annotSize.width + headLength}
      height={annotSize.height + headLength}
      fill="transparent"
      stroke={annotIsFocused ? '#a0a0a0' : annotHovered ? '#d3d3d3' : 'none'}
      stroke-width="1"
    />
    <!-- move controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <line
      class="move-annot"
      x1="0"
      y1="0"
      x2={annotSize.width || 1}
      y2={annotSize.height || 1}
      stroke-width={strokeWidth * 6}
      on:mousedown={moveAnnotHandler}
    />
  {/if}

  {#if $SelectedTool === '' && annotIsFocused}
    <!-- origin controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx="0"
      cy="0"
      r={4}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleMoveOrigin, 'pointer')
      }}
    />
    <!-- pointer controller -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <circle
      class="resize"
      cx={annotSize.width}
      cy={annotSize.height}
      r={4}
      on:mousedown={(e) => {
        if (e.button !== 0) return
        attachMouseMoveListener(handleMovePointer, 'pointer')
      }}
    />
  {/if}
</svg>

<style lang="scss">
  .arrow {
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
    stroke: transparent; // rgba(0, 0, 0, 0.5)
    stroke-linecap: round;
  }

  .resize {
    fill: #0061d1;
    stroke: #fff;
    stroke-width: 2;
    cursor: pointer;
    z-index: 20;
  }
</style>
