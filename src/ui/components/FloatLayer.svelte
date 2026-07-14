<script lang="ts">
  import type { FloatText } from '../game.svelte'

  let { floats }: { floats: FloatText[] } = $props()
</script>

<!-- Floating numbers live in arena space, not card space: a number is the
     receipt for an impact, so it belongs where the impact happened — and its
     size *is* the information. A chip tick and a Pyroblast crit should never
     need to be read to tell them apart. -->
<div class="fx" aria-hidden="true">
  {#each floats as f (f.id)}
    <span class="float {f.kind}" style:left="{f.x}px" style:top="{f.y}px" style:--tone={f.tone} style:--s={f.scale}>
      {#if f.kind === 'heal'}+{f.amount}{:else if f.kind === 'absorb'}({f.amount}){:else}{f.amount}{/if}
    </span>
  {/each}
</div>

<style>
  .fx {
    position: absolute;
    inset: -40px;
    pointer-events: none;
    z-index: 4;
    overflow: visible;
  }

  .float {
    position: absolute;
    font-size: calc(21px * var(--s));
    font-weight: 760;
    line-height: 1;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--tone);
    text-shadow:
      0 0 calc(9px * var(--s)) color-mix(in oklch, var(--tone) 75%, transparent),
      0 2px 10px oklch(0.1 0.025 280 / 0.9);
    animation: float-pop 980ms var(--ease-punch) both;
    will-change: transform, opacity;
  }

  /* A crit is not a bigger number. It is a different event: white-hot, struck
     in off-axis, ringed in its own colour, and it hangs there. */
  .float.crit {
    font-weight: 830;
    color: oklch(0.98 0.05 92);
    -webkit-text-stroke: calc(1px * var(--s)) color-mix(in oklch, var(--tone) 85%, black);
    paint-order: stroke fill;
    text-shadow:
      0 0 calc(8px * var(--s)) var(--tone),
      0 0 calc(22px * var(--s)) color-mix(in oklch, var(--tone) 80%, transparent),
      0 0 calc(52px * var(--s)) color-mix(in oklch, var(--tone) 55%, transparent),
      0 3px 12px oklch(0.1 0.025 280 / 0.9);
    animation: crit-pop 1250ms var(--ease-punch) both;
  }

  .float.heal {
    font-weight: 700;
  }

  .float.absorb {
    font-weight: 680;
    opacity: 0.9;
  }

  @keyframes float-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 0) scale(0.5);
    }
    12% {
      opacity: 1;
      transform: translate(-50%, -8px) scale(1.22);
    }
    24% {
      transform: translate(-50%, -13px) scale(1);
    }
    68% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -56px) scale(0.9);
    }
  }

  /* Overshoot hard, snap back, then a second smaller swell — the double-punch
     is what makes a crit feel like it *hit* something. */
  @keyframes crit-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 10px) scale(0.3) rotate(-10deg);
    }
    9% {
      opacity: 1;
      transform: translate(-50%, -12px) scale(1.7) rotate(5deg);
    }
    20% {
      transform: translate(-50%, -18px) scale(1.02) rotate(-2deg);
    }
    30% {
      transform: translate(-50%, -21px) scale(1.22) rotate(0deg);
    }
    42% {
      transform: translate(-50%, -24px) scale(1.08);
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -78px) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .float,
    .float.crit {
      animation: float-still 900ms linear both;
    }

    @keyframes float-still {
      0%,
      70% {
        opacity: 1;
        transform: translate(-50%, -14px);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -14px);
      }
    }
  }
</style>
