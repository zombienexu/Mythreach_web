<script lang="ts">
  import type { Side } from '../../engine'

  let { power = 1, side = 'enemy' }: { power?: number; side?: Side } = $props()
</script>

<!-- A crit is felt past the card it landed on. The room takes it: a fast wash
     of light from the edges, warm when you deal it, red when you take it.
     Re-armed by a {#key} on the crit counter, so it fires once per crit. -->
<div class="crit-flash" class:incoming={side === 'player'} style:--p={Math.min(1, power / 2)} aria-hidden="true"></div>

<style>
  .crit-flash {
    position: fixed;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(120% 90% at 50% 50%, transparent 30%, oklch(0.9 0.14 75 / 0.55) 100%);
    animation: crit-wash 300ms var(--ease-out-expo) both;
  }

  /* taking one hurts: the wash goes red */
  .crit-flash.incoming {
    background: radial-gradient(120% 90% at 50% 50%, transparent 26%, oklch(0.62 0.22 25 / 0.7) 100%);
    animation-duration: 380ms;
  }

  @keyframes crit-wash {
    0% {
      opacity: calc(0.35 + var(--p) * 0.65);
    }
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .crit-flash {
      animation: none;
    }
  }
</style>
