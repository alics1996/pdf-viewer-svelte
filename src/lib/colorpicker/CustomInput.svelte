<script lang="ts">
  export let labelWrapper: HTMLLabelElement
  export let hex: string
  export let label: string

  export let isOpen: boolean
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<label
  class="wrapper"
  bind:this={labelWrapper}
  on:click|preventDefault={() => {
    /* prevent default behavior on safari */
  }}
  on:mousedown|preventDefault={() => {
    /* prevent default behavior on safari */
  }}
>
  <span class="label">{label}</span>
  <div class="container">
    <input
      type="color"
      value={hex}
      on:click|preventDefault={() => {
        /* prevent default behavior on most browsers */
      }}
      on:mousedown|preventDefault={() => {
        /* prevent default behavior on safari */
      }}
    />
    <div class="alpha" />
    <div class="color" style="background: {hex}" />
  </div>
</label>

<style>
  .wrapper {
    --focus-color: blue;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    height: 1.2rem;
  }
  .wrapper > *:empty {
    display: none;
  }

  .label {
    font-size: 1rem;
  }

  .container {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
    aspect-ratio: 1/1;
    justify-content: center;
  }

  input,
  .alpha,
  .color {
    all: unset;
    position: absolute;
    height: 100%;
    width: 100%;
    border-radius: 50%;
    cursor: pointer;
    user-select: none;
  }

  input:focus {
    outline: 2px solid var(--focus-color, red);
    outline-offset: 5px;
  }
  .alpha {
    clip-path: circle(50%);
    background-image: linear-gradient(
        to right,
        rgba(238, 238, 238, 0.75),
        rgba(238, 238, 238, 0.75)
      ),
      linear-gradient(to right, black 50%, white 50%),
      linear-gradient(to bottom, black 50%, white 50%);
    background-blend-mode: normal, difference, normal;
    background-size: 12px 12px;
    border: 1px solid black;
  }
</style>
