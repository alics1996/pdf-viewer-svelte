<script lang="ts">
  import { isCmd } from '$utils/util'
  import {
    AnnotColor,
    AnnotTools,
    FileName,
    PDFLibDoc,
    PDFLibPages,
    SelectedTool,
    StoredAnnotations,
  } from '$utils/stores'

  export let pageViewNum: number
  $: totalPages = $PDFLibPages.length

  async function handleSave() {
    const pdfDoc = await $PDFLibDoc!.copy()

    const storedAnnotations = $StoredAnnotations
    for (let i = 0; i < storedAnnotations.length; i++) {
      await storedAnnotations[i].embeddAnnot(pdfDoc)
    }

    const pdfData = await pdfDoc.save({ useObjectStreams: false })
    const blob = new Blob([pdfData], { type: 'application/pdf' })

    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = $FileName
    link.click()
  }

  function validateInput(
    e: Event & {
      currentTarget: HTMLInputElement
    },
  ) {
    const target = e.currentTarget

    const { value, selectionStart, selectionEnd } = target
    const length_old = value.length

    target.value = value.replace(/[^\d]+/g, '')

    if (selectionStart !== null && selectionEnd !== null) {
      const length_new = target.value.length

      target.selectionStart = selectionStart - (length_old - length_new)
      target.selectionEnd = selectionEnd - (length_old - length_new)
    } else {
      target.selectionStart = target.selectionEnd = target.value.length
    }
  }

  function scrollPageIntoView(
    e: Event & {
      currentTarget: HTMLInputElement
    },
  ) {
    const value = parseInt(e.currentTarget.value) || 1
    pageViewNum = Math.max(Math.min(value, totalPages), 1)

    $PDFLibPages.at(pageViewNum - 1)?.pageDiv?.scrollIntoView(true)
  }
</script>

<section class="toolbar">
  <div class="toolbar-buttons">
    <div class="div-1">
      <button
        type="button"
        id="home-button"
        on:click={() => PDFLibDoc.set(null)}>⌂</button
      >
      <select name="tool" id="tool-select" bind:value={$SelectedTool}>
        {#each AnnotTools as item}
          <option value={item}>{item}</option>
        {/each}
      </select>
      <input
        type="color"
        list="preset-colors"
        id="color-picker"
        bind:value={$AnnotColor}
      />
      <datalist id="preset-colors">
        <option>#eb1a30</option>
        <option>#000000</option>
        <option>#ffffff</option>
      </datalist>
    </div>

    <div class="div-2">
      <input
        type="text"
        bind:value={pageViewNum}
        on:input={validateInput}
        on:change={scrollPageIntoView}
        on:focus={(e) => {
          e.currentTarget.select()
        }}
      />
      / {totalPages}
    </div>

    <div class="div-3">
      <button type="button" on:click={handleSave}>Save</button>
    </div>
  </div>
</section>

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
  }}
/>

<style lang="scss">
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background-color: #fff;
    width: 100%;
    padding: 2px 5px;
    border: 1px solid black;
    box-sizing: border-box;
    height: 30px;

    .toolbar-buttons {
      display: flex;
      height: 100%;
      align-items: center;
      justify-content: space-between;

      > div {
        display: flex;
        flex: 1;
        align-items: center;

        input,
        button,
        select {
          margin: 0;
          height: 25px;
          text-align: center;
          vertical-align: middle;
          box-sizing: border-box;
        }
      }
      .div-1 {
        justify-content: start;
      }
      .div-2 {
        justify-content: center;
        input {
          width: 30px;
          margin: 0 3px;
        }
      }
      .div-3 {
        justify-content: end;
      }
    }
  }

  #home-button {
    margin-right: 10px;
  }
</style>
