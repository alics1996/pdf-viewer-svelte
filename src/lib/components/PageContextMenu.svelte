<svelte:options accessors />

<script lang="ts">
  export let deletePage: () => void
  export let insertPage: () => void

  let showMenu = false

  let menuPos = { x: 0, y: 0 }
  let menuSize = { h: 0, w: 0 }
  let windowSize = { h: 0, w: 0 }

  let menuItems = [
    {
      name: 'deletePage',
      displayText: 'Delete page',
      onClick: deletePage,
      class: '',
    },
    {
      name: 'insertPage',
      displayText: 'Insert page',
      onClick: insertPage,
      class: '',
    },
    // {
    //     name: 'hr',
    // },
  ]

  export function rightClickContextMenu(
    e: MouseEvent & { currentTarget: EventTarget & HTMLElement },
  ) {
    const target = e.currentTarget
    const { top, left } = target.getBoundingClientRect()

    showMenu = true
    menuPos = {
      x: e.clientX - left,
      y: e.clientY - top,
    }

    windowSize = {
      w: window.innerWidth,
      h: window.innerHeight,
    }

    if (windowSize.h - menuPos.y < menuSize.h)
      menuPos.y = menuPos.y - menuSize.h
    if (windowSize.w - menuPos.x < menuSize.w)
      menuPos.x = menuPos.x - menuSize.w
  }

  function hidePageContextMenu() {
    if (showMenu) showMenu = false
  }

  function getContextMenuDimension(node: HTMLElement) {
    menuSize = {
      h: node.offsetHeight,
      w: node.offsetWidth,
    }
  }
</script>

{#if showMenu}
  <nav
    use:getContextMenuDimension
    style="position: absolute; top:{menuPos.y}px; left:{menuPos.x}px;"
  >
    <div class="navbar" id="navbar">
      <ul>
        {#each menuItems as item}
          {#if item.name == 'hr'}
            <hr />
          {:else}
            <li>
              <button on:click={item.onClick}
                ><i class={item.class} />{item.displayText}</button
              >
            </li>
          {/if}
        {/each}
      </ul>
    </div>
  </nav>
{/if}

<svelte:window
  on:click={hidePageContextMenu}
  on:contextmenu={hidePageContextMenu}
/>

<style>
  * {
    padding: 0;
    margin: 0;
  }
  nav {
    z-index: 9999;
  }
  .navbar {
    display: inline-flex;
    border: 1px solid black;
    border-radius: 3px;
    width: 170px;
    background-color: #fff;
    overflow: hidden;
    flex-direction: column;
  }
  .navbar ul {
    margin: 6px;
  }
  ul li {
    display: block;
    list-style-type: none;
    /* width: 1fr; */
  }
  ul li button {
    /* font-size: 1rem; */
    color: black;
    cursor: pointer;
    width: 100%;
    /* height: 30px; */
    text-align: left;
    border: 0px;
    background-color: #fff;
  }
  ul li button:hover {
    color: #000;
    text-align: left;
    border-radius: 5px;
    background-color: #eee;
  }
  ul li button i {
    padding: 0px 15px 0px 10px;
  }
  hr {
    border: none;
    border-bottom: 1px solid #ccc;
    margin: 5px 0px;
  }
</style>
