<script lang="ts">
  export let file: File
  export let deleteItem: () => void
  export let numPages: number
  export let imgSrc: string

  const fileName = file.name
  const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB'

  let showPopOver = false
  function displayPopOver() {
    showPopOver = true
  }
  function hidePopOver() {
    showPopOver = false
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="flex-container"
  on:mouseenter={displayPopOver}
  on:mouseleave={hidePopOver}
>
  <div
    class="trash-icon"
    on:click={(e) => {
      e.stopPropagation()
      deleteItem()
    }}
    on:keydown={() => {}}
  >
    <svg width="100%" viewBox="0 0 15 15">
      <path
        d="M2,13 L13,2 M2,2 L13,13"
        stroke="#939393"
        stroke-width="1.5"
        stroke-linecap="butt"
        fill="transparent"
      />
    </svg>
  </div>
  {#if showPopOver}
    <div class="pop-over">
      <div>{numPages + (numPages === 1 ? ' page' : ' pages')}</div>
      <div>{fileSize}</div>
    </div>
  {/if}
  <img src={imgSrc} alt="" />
</div>
<span class="file-name">{fileName}</span>

<style lang="scss">
  .flex-container {
    position: relative;
    border: 1px solid #8d8d8d;
    box-sizing: border-box;
    background-color: #e2e2e2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 145px;
    height: 145px;

    > .trash-icon {
      position: absolute;
      background-color: #fff;
      border: 1px solid #333;
      border-radius: 3px;
      top: 2px;
      right: 2px;
      color: #c05353;
      width: 16px;
      height: 16px;
      cursor: pointer;
      z-index: 10;
    }
    > .pop-over {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(1px);

      > div {
        background-color: #ffffff8d;
        border-radius: 2px;
        width: max-content;
        font-size: 13px;
      }
      :not(:first-child) {
        margin-top: 4px;
      }
    }
    > img {
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.4);
      max-width: 95%;
      max-height: 95%;
    }
  }

  .file-name {
    padding: 1px;
    display: block;
    width: 100%;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
