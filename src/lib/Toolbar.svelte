<script lang="ts">
  import Fa from 'svelte-fa'
  import { faHouse } from '@fortawesome/free-solid-svg-icons'

  import {
    FileName,
    PDFLibDoc,
    PDFLibPages,
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
        on:click={() => PDFLibDoc.set(undefined)}
      >
        <Fa icon={faHouse} />
      </button>
    </div>

    <div class="div-2">
      <div>
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
    </div>

    <div class="div-3">
      <button type="button" on:click={handleSave}>Save</button>
    </div>
  </div>
</section>

<style lang="scss">
  .toolbar {
    position: sticky;
    top: 0;
    font-size: 0.8em;
    z-index: 9999;
    background-color: #fff;
    width: 100%;
    padding: 2px 5px;
    border-bottom: 1px solid black;
    box-sizing: border-box;
    height: 2.5em;

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
        button {
          margin: 0;
          height: 2em;
          padding: 0.4em 0.7em;
          font-size: inherit;
          border: 0 solid transparent;
          outline: 0 solid transparent;
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
        gap: 10px;
        input {
          width: 30px;
          // margin: 0 3px;
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
