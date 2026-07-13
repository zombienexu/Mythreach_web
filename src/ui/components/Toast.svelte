<script lang="ts">
  let { title, body }: { title: string; body: string } = $props()
</script>

<div class="glass toast" role="status">
  <span class="mark" aria-hidden="true">✦</span>
  <div class="text">
    <span class="eyebrow">achievement</span>
    <span class="title">{title}</span>
    {#if body}<span class="body">{body}</span>{/if}
  </div>
</div>

<style>
  .toast {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 35;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 20px;
    max-width: 320px;
    background: oklch(0.16 0.03 274 / 0.92);
    border: 1px solid oklch(0.8 0.13 80 / 0.3);
    animation: toast-in 4.2s ease both;
    pointer-events: none;
  }

  .mark {
    font-size: 22px;
    color: var(--ember);
    text-shadow: 0 0 16px oklch(0.8 0.13 80 / 0.7);
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .eyebrow {
    font-size: 9.5px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .title {
    font-size: 14.5px;
    font-weight: 640;
    color: var(--ember);
  }

  .body {
    font-size: 12px;
    color: var(--text-dim);
  }

  @keyframes toast-in {
    0% {
      opacity: 0;
      transform: translateY(14px);
    }
    6% {
      opacity: 1;
      transform: translateY(0);
    }
    88% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>
