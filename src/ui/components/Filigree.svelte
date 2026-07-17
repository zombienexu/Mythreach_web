<script lang="ts">
  /** Gilt corner-work for ceremonial surfaces — the scribe's flourish at the
   *  corners of a plate. Drop inside any relatively-positioned card. Quiet by
   *  design: chrome ornament, never a reward. */
  let { inset = 5, size = 22 }: { inset?: number; size?: number } = $props()

  const CORNERS = ['tl', 'tr', 'bl', 'br'] as const
</script>

{#each CORNERS as corner (corner)}
  <svg
    class="fil {corner}"
    style:--inset="{inset}px"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M2 14 V6 Q2 2 6 2 H14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linecap="round"
    />
    <path
      d="M6 9 Q6 6 9 6"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      opacity="0.7"
    />
    <circle cx="17.5" cy="2" r="1.1" fill="currentColor" opacity="0.9" />
    <circle cx="2" cy="17.5" r="1.1" fill="currentColor" opacity="0.9" />
  </svg>
{/each}

<style>
  .fil {
    position: absolute;
    color: oklch(0.78 0.1 85 / 0.4);
    pointer-events: none;
  }

  .tl {
    top: var(--inset);
    left: var(--inset);
  }

  .tr {
    top: var(--inset);
    right: var(--inset);
    transform: rotate(90deg);
  }

  .br {
    bottom: var(--inset);
    right: var(--inset);
    transform: rotate(180deg);
  }

  .bl {
    bottom: var(--inset);
    left: var(--inset);
    transform: rotate(270deg);
  }
</style>
