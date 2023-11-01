<script lang="ts">
  import Fa from 'svelte-fa'
  import { faSquare, faImage } from '@fortawesome/free-regular-svg-icons'
  import {
    faArrowRight,
    faCheck,
    faSignature,
    type IconDefinition,
  } from '@fortawesome/free-solid-svg-icons'

  import ColorPicker from 'svelte-awesome-color-picker'

  import { attachMouseMoveListener, isCmd } from './utils/util'
  import { AnnotColor, AnnotTools, SelectedTool } from './utils/stores'
  import CustomInput from './colorpicker/CustomInput.svelte'
  import CustomWrapper from './colorpicker/CustomWrapper.svelte'

  let toolbarRef: HTMLElement | undefined
  let toolbarPos = {
    top: 40,
    left: 10,
  }
  $: if (toolbarRef) {
    toolbarRef.style.top = toolbarPos.top + 'px'
    toolbarRef.style.left = toolbarPos.left + 'px'
  }
  function handleMoveToolbar(ev: MouseEvent) {
    if (!toolbarRef || ev.button !== 0) return
    ev.preventDefault()

    let { clientX, clientY } = ev

    attachMouseMoveListener((e) => {
      toolbarPos.left += e.clientX - clientX
      toolbarPos.top += e.clientY - clientY
      ;(clientX = e.clientX), (clientY = e.clientY)
    }, 'grabbing')
  }

  let buttons: {
    tool: (typeof AnnotTools)[number]
    icon: IconDefinition
  }[] = [
    { tool: 'square', icon: faSquare },
    { tool: 'arrow', icon: faArrowRight },
    { tool: 'checkmark', icon: faCheck },
    { tool: 'signature', icon: faSignature },
    { tool: 'image', icon: faImage },
  ]

  // whenever hex changes should update AnnotColor store
  $: AnnotColor.set(hex)
  // whenever AnnotColor is chgd, should update value of hex
  // thought might create circular dependency, but apparently doesn't
  // (can't bind the store to ColorPicker fsr)
  $: hex = $AnnotColor
</script>

<div class="secondary-toolbar" bind:this={toolbarRef}>
  <button class="move-controller" on:mousedown={handleMoveToolbar} />
  <div class="buttons">
    {#each buttons as btn}
      <button
        on:mousedown={() =>
          SelectedTool.update((val) => (val === btn.tool ? '' : btn.tool))}
        class={btn.tool === $SelectedTool ? 'active' : ''}
      >
        <Fa icon={btn.icon} />
      </button>
    {/each}
    <ColorPicker
      bind:hex
      label=""
      isAlpha={false}
      components={{ input: CustomInput, wrapper: CustomWrapper }}
    />
  </div>
</div>

<svelte:window
  on:keydown={(e) => {
    if (isCmd(e)) return

    const target = e.target
    const key = e.key.toLowerCase()

    if (target instanceof HTMLElement && target.matches('input')) {
      return
    }

    if ($SelectedTool !== '' && key === 'escape') {
      SelectedTool.set('')
      return
    }
    if (key === 's' && !e.shiftKey) {
      e.preventDefault()
      SelectedTool.set('square')
      return
    }
    if (key === 's' && e.shiftKey) {
      e.preventDefault()
      SelectedTool.set('signature')
      return
    }
    if (key === 'a') {
      e.preventDefault()
      SelectedTool.set('arrow')
      return
    }
    if (key === 'c') {
      e.preventDefault()
      SelectedTool.set('checkmark')
      return
    }
    if (key === 'i') {
      e.preventDefault()
      SelectedTool.set('image')
      return
    }
  }}
/>

<style lang="scss">
  .secondary-toolbar {
    position: absolute;
    z-index: 9999;
    width: 45px;
    border: 1px solid black;
    border-radius: 4px;
    padding: 0 3px;
    background: #fff;
  }
  .move-controller {
    background: #6a797e;
    height: 5px;
    width: 100%;
    padding: 0;
    display: block;
    border-radius: 3px;
    cursor: grab;
    margin: 5px 0 10px 0;
  }
  .buttons {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    margin: 5px 0;

    button {
      font-size: 0.9em;
      padding: 0.15em 0;
      &:is(.active) {
        background: #b9e6dc;
        color: #000;
      }
    }
  }
</style>
