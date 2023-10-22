<script lang="ts">
  import Fa from 'svelte-fa'
  import { faCloudArrowUp } from '@fortawesome/free-solid-svg-icons'

  import { dndzone } from 'svelte-dnd-action'
  import { flip } from 'svelte/animate'

  import { PDFDocument } from 'pdf-lib'

  import { PDFLibDoc, FileName } from '$utils/stores'
  import { getPDFJsDocument } from '$utils/pdf_utils'

  import { backtick, canvasCtxNotSupportedError } from '$utils/util'
  import DocPreview from '$lib/DocPreview.svelte'

  const flipDurationMs = 100

  let enterTarget: EventTarget | null
  type DragEventType = DragEvent & {
    currentTarget: EventTarget & HTMLDivElement
  }

  function dragEnterHandler(e: DragEventType) {
    enterTarget = e.target
    e.currentTarget.classList.add('drop-active')
  }
  function dragOverHandler(e: DragEventType) {
    e.preventDefault()
  }
  function dragLeaveHandler(e: DragEventType) {
    if (enterTarget !== e.target) return
    enterTarget = null
    e.currentTarget.classList.remove('drop-active')
  }
  function dropHandler(e: DragEventType) {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-active')

    const fileList = e.dataTransfer?.files
    fileList && readFileList(fileList)
  }

  function inputHandler(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'application/pdf'
    fileInput.multiple = true

    fileInput.onchange = function () {
      const fileList = fileInput.files
      fileList && readFileList(fileList)
    }

    fileInput.click()
  }

  let files: {
    id: number
    file: File
    pdfData: ArrayBuffer
    numPages: number
    imgSrc: string
  }[] = []
  let filesId = 0

  async function readFileList(fileList: FileList) {
    const reader = new FileReader()

    for (const file of fileList) {
      const buffer = await new Promise<string | ArrayBuffer | null>(
        (resolve, reject) => {
          reader.onload = () => resolve(reader.result)
          reader.onerror = (error) => {
            console.error('Error reading the file!\n', error)
            reject()
          }
          reader.readAsArrayBuffer(file)
        },
      )
      if (buffer instanceof ArrayBuffer) {
        const pdfDoc = await getPDFJsDocument(buffer.slice(0))

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw canvasCtxNotSupportedError

        const page = await pdfDoc.getPage(1)
        const scale = 0.5

        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderContext = {
          canvasContext: ctx,
          viewport,
        }
        await page.render(renderContext).promise

        const numPages = pdfDoc.numPages
        const imgSrc = canvas.toDataURL()
        files.push({
          id: filesId++,
          pdfData: buffer,
          file,
          numPages,
          imgSrc,
        })
      } else {
        throw Error(
          'FileReader returned ' +
            backtick(buffer && buffer.constructor.name) +
            ', instead of' +
            backtick('ArrayBuffer'),
        )
      }
    }
    files = files
  }

  type ItemType = (typeof files)[number]
  function handleConsider(e: CustomEvent<DndEvent<ItemType>>) {
    files = e.detail.items
  }
  function handleFinalize(e: CustomEvent<DndEvent<ItemType>>) {
    files = e.detail.items
  }

  async function loadPdfHandler() {
    if (files.length === 0) return

    if (files.length === 1) {
      const file = files[0]

      FileName.set(file.file.name)
      PDFLibDoc.set(await PDFDocument.load(file.pdfData))
      return
    }

    const mergedPdf = await PDFDocument.create()

    for (const file of files) {
      const pdfDoc = await PDFDocument.load(file.pdfData)
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices(),
      )

      for (const page of copiedPages) {
        mergedPdf.addPage(page)
      }
    }

    FileName.set('mergedPdf.pdf')
    PDFLibDoc.set(mergedPdf)
  }

  async function loadTestDocument() {
    fetch('/tracemonkey.pdf')
      .then((data) => {
        if (!data.ok) {
          throw new Error('Network response not ok')
        }
        return data.arrayBuffer()
      })
      .then(async (data) => {
        const pdfDoc = await PDFDocument.load(data)
        FileName.set('document.pdf')
        PDFLibDoc.set(pdfDoc)
      })
      .catch((err) => {
        console.error('Error loading the file:', err)
      })
  }
</script>

<div class="dropzone-wrapper">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    id="dropzone"
    tabindex="-1"
    on:dragenter={dragEnterHandler}
    on:dragover={dragOverHandler}
    on:dragleave={dragLeaveHandler}
    on:drop={dropHandler}
    on:click={inputHandler}
  >
    {#if !files.length}
      <div class="dropzone-content">
        <div>
          <Fa icon={faCloudArrowUp} color="#7d91a0" size="2.5em" />
          <br />
          <strong>Drag and Drop file(s) here</strong>
        </div>
        <div class="text separator"><span>or</span></div>
        <div>
          <button type="button" id="browse-files-btn">Browse Files</button>
        </div>
        <div class="text">
          Accepted file types: <strong>*.pdf</strong> only.
        </div>
      </div>
    {/if}
  </div>
  <div
    class="uploaded-files"
    use:dndzone={{
      items: files,
      flipDurationMs,
      dropTargetStyle: {},
    }}
    on:consider={handleConsider}
    on:finalize={handleFinalize}
  >
    {#each files as item (item.id)}
      <div animate:flip={{ duration: flipDurationMs }} class="file-item">
        <DocPreview
          file={item.file}
          deleteItem={() => {
            files = files.filter((i) => i !== item)
          }}
          numPages={item.numPages}
          imgSrc={item.imgSrc}
        />
      </div>
    {/each}
  </div>
  <div id="form">
    <div />
    <div>
      <button
        id="load-files-btn"
        on:click={loadPdfHandler}
        disabled={!files.length}>Load Files</button
      >
    </div>
  </div>
</div>

<style lang="scss">
  * {
    // border: 1px solid blue;
  }
  .dropzone-wrapper {
    min-width: 650px;
    background-color: whitesmoke;
    border-radius: 0.5em;
    padding: 2em;
    text-align: center;

    > div {
      width: 100%;
      box-sizing: border-box;

      &:not(:last-child) {
        margin-bottom: 1em;
      }
    }
  }

  #dropzone {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    position: relative;
    padding: 4em 0 3em 0;
    background-color: #dfe4e4;
    outline: 2px solid transparent;
    border-radius: 0;
    overflow: hidden;
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='0' ry='0' stroke='rgb(120 135 150)' stroke-width='2' stroke-dasharray='4%2c 3' stroke-dashoffset='0' stroke-linecap='butt'/%3e%3c/svg%3e");
    background-repeat: no-repeat;

    cursor: pointer;

    &:is(.drop-active) {
      background-image: none;
      outline: 2px solid #4b5569;
      border-radius: 2px;
      transition: all 0.4s ease;
    }

    .dropzone-content {
      font-size: 0.95em;
      font-weight: 600;
      color: #5a6469;

      > div:not(:last-child) {
        margin-bottom: 3em;
      }

      $col: #aaafb9;

      .text {
        color: $col;
        font-size: 0.9em;
        letter-spacing: -0.5px;
      }

      .separator {
        &::before,
        &::after {
          content: '';
          display: inline-block;
          width: 8em;
          border-top: 1px solid $col;
          margin: 0.3em 1em;
        }
      }
    }
  }

  .file-item {
    position: relative;
    display: inline-block;
    vertical-align: top;
    margin: 2px;
    cursor: move;
    width: 145px;
  }

  #uploaded-files {
  }

  #form {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    // margin-top: 5px;
    // border: 2px solid transparent;
    // padding: 2px;

    #load-files-btn {
      $col: #333;
      $bg_col: #005df3;

      font-size: 0.9em;
      padding: 0.6em 1.6em;
      background-color: $bg_col;
      font-weight: bold;

      &:disabled {
        background-color: #ddd;
        color: whitesmoke;
        cursor: not-allowed;
      }
    }
  }

  #browse-files-btn {
    $bg_col: #c1ccd1;
    $col: #333;

    color: $col;
    background-color: $bg_col;
    padding: 0.8em 1.3em;
    font-weight: bold;

    transition: background-color 0.2s linear;

    &:hover {
      color: darken($col, 5%);
      background-color: darken($bg_col, 5%);
    }
  }
</style>
