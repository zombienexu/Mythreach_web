<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label,
    onclose,
    children,
  }: {
    label: string
    onclose?: () => void
    children: Snippet
  } = $props()

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose?.()
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose?.()}>
  <div class="glass modal" role="dialog" aria-modal="true" aria-label={label}>
    {@render children()}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 24px;
    background: oklch(0.08 0.02 280 / 0.6);
    backdrop-filter: blur(3px);
    animation: scrim-in 220ms ease both;
  }

  .modal {
    width: min(480px, 100%);
    max-height: min(80dvh, 640px);
    overflow-y: auto;
    padding: 28px 30px;
    background: oklch(0.16 0.03 274 / 0.92);
    animation: modal-in 320ms var(--ease-spring) both;
    scrollbar-width: thin;
  }

  @keyframes scrim-in {
    from {
      opacity: 0;
    }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.97);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scrim,
    .modal {
      animation: none;
    }
  }
</style>
