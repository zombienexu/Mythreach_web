<script lang="ts">
  import type { FloatText } from '../game.svelte'

  let { floats }: { floats: FloatText[] } = $props()
</script>

<!-- Floating numbers live in arena space, not card space: a number is the
     receipt for an impact, so it belongs where the impact happened. -->
<div class="fx" aria-hidden="true">
  {#each floats as f (f.id)}
    <span class="float {f.kind}" style:left="{f.x}px" style:top="{f.y}px" style:--tone={f.tone}>
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
    overflow: hidden;
    border-radius: var(--radius);
  }

  .float {
    position: absolute;
    font-size: 24px;
    font-weight: 760;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--tone);
    text-shadow:
      0 0 12px color-mix(in oklch, var(--tone) 70%, transparent),
      0 2px 10px oklch(0.1 0.025 280 / 0.9);
    animation: float-pop 950ms var(--ease-punch) both;
    will-change: transform, opacity;
  }

  /* A crit is not a bigger number. It is a different event: white-hot, kicked
     off-axis, and it hangs in the air longer than anything else. */
  .float.crit {
    font-size: 40px;
    font-weight: 800;
    color: oklch(0.97 0.06 90);
    text-shadow:
      0 0 10px var(--tone),
      0 0 26px color-mix(in oklch, var(--tone) 80%, transparent),
      0 0 60px color-mix(in oklch, var(--tone) 50%, transparent),
      0 3px 12px oklch(0.1 0.025 280 / 0.9);
    animation: crit-pop 1150ms var(--ease-punch) both;
  }

  .float.absorb {
    font-size: 18px;
    font-weight: 680;
    opacity: 0.9;
  }

  @keyframes float-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 0) scale(0.55);
    }
    12% {
      opacity: 1;
      transform: translate(-50%, -8px) scale(1.2);
    }
    24% {
      transform: translate(-50%, -13px) scale(1);
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -54px) scale(0.92);
    }
  }

  @keyframes crit-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 6px) scale(0.35) rotate(-8deg);
    }
    10% {
      opacity: 1;
      transform: translate(-50%, -10px) scale(1.55) rotate(4deg);
    }
    22% {
      transform: translate(-50%, -16px) scale(1.08) rotate(-1deg);
    }
    30% {
      transform: translate(-50%, -18px) scale(1.18) rotate(0deg);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -72px) scale(1);
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
