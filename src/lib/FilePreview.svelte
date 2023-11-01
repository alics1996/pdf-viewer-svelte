<script lang="ts">
  import Fa from 'svelte-fa'
  import { faXmark, faFilePdf } from '@fortawesome/free-solid-svg-icons'
  import { onMount } from 'svelte'
  import type { LoadedFileT } from './stores'

  export let fileStore: LoadedFileT

  let isLoading = true
  let isInvalid = false
  let errorMessage = ''
  let transitionDelay = 200

  function handleDeleteItem() {
    fileStore.isMounted = false
    setTimeout(fileStore.deleteItem, transitionDelay)
  }

  let numPages: number | undefined
  const file = fileStore.file
  const fileName = file.name
  const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB'

  fileStore.promise
    .then(() => {
      isLoading = false
      numPages = fileStore.pdfDoc?.getPageCount()
    })
    .catch((err: unknown) => {
      isInvalid = true
      errorMessage =
        err instanceof Error
          ? err.message
          : err?.toString() ?? 'No information available'
    })

  onMount(() => {
    if (fileStore.isMounted) return
    setTimeout(
      () => (fileStore.isMounted = true),
      (fileStore.filelistIdx + 1) * 10,
    )
  })
</script>

<div
  class="main-wrapper"
  style="--delay: {transitionDelay}ms"
  data-hidden={!fileStore.isMounted || null}
  data-is-loading={isLoading || null}
  data-is-invalid={isInvalid || null}
>
  <div>
    <Fa icon={faFilePdf} color="gray" size="1.5em" />
  </div>

  <div class="file-info">
    {#if errorMessage}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="error-msg"
        on:mousedown|preventDefault|stopPropagation={() => {}}
      >
        <div>⚠</div>
        <div class="message">{errorMessage}</div>
      </div>
    {/if}
    <div class="file-name">{fileName}</div>
    <div class="file-size">
      ({(numPages !== undefined
        ? `${numPages} ${numPages === 1 ? 'page, ' : 'pages, '}`
        : '') + fileSize})
    </div>
  </div>

  <button class="remove-file-btn" on:click|stopPropagation={handleDeleteItem}>
    <Fa icon={faXmark} color="#7d91a0" size="1.3em" />
  </button>
</div>

<style lang="scss">
  * {
    // border: 1px solid blue;
    box-sizing: border-box;
  }
  .main-wrapper[data-hidden] {
    height: 0;
    opacity: 0;
  }
  .main-wrapper[data-is-invalid] {
    .file-name {
      text-decoration: line-through;
      text-decoration-color: #333;
    }
  }
  // .main-wrapper[data-is-loading] {
  // custom styles to show that file is being
  // read / uploaded etc.
  // }
  .main-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1em;
    height: 3em;
    transition: height var(--delay) ease, opacity var(--delay) ease;
  }

  .remove-file-btn {
    padding: 0.3em;
    aspect-ratio: 1/1;
    color: #c05353;
    background-color: transparent;
    cursor: pointer;
  }

  .file-info {
    flex: 1;
    display: flex;
    gap: 0.5em;
    text-align: left;
    align-items: center;
    min-width: 0;

    .error-msg {
      color: #f00;
      font-size: 1.2em;
      position: relative;
      cursor: auto;

      .message {
        visibility: hidden;
        display: block;
        opacity: 0;
        width: 400px;
        position: absolute;
        font-size: 0.7em;
        font-weight: 500;
        padding: 1em;
        z-index: 1;
        background: whitesmoke;
        top: 100%;
        left: -100%;
        transition: all 0.3s ease;
      }
      &:hover .message {
        visibility: visible;
        opacity: 1;
      }
    }
    .file-name {
      font-size: 0.85em;
      font-weight: 600;
      color: #5a6469;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .file-size {
      white-space: nowrap;
      font-size: 0.75em;
      color: gray;
      flex: 1;
    }
  }
</style>
