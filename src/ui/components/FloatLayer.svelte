<script lang="ts">
  import type { FloatText } from '../game.svelte'

  let { floats }: { floats: FloatText[] } = $props()
</script>

<!-- floating damage/heal numbers; shared by both cards -->
<div class="fx" aria-hidden="true">
  {#each floats as f (f.id)}
    <span class="float {f.kind}" style:left="{f.x}%">
      {#if f.kind === 'heal'}+{f.amount}{:else if f.kind === 'absorb'}({f.amount}){:else}{f.amount}{/if}
    </span>
  {/each}
</div>

<style>
  .fx {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }

  .float {
    position: absolute;
    top: 42%;
    font-size: 21px;
    font-weight: 720;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 10px oklch(0.1 0.025 280 / 0.8);
    animation: float-pop 950ms cubic-bezier(0.2, 0.7, 0.4, 1) both;
    will-change: transform, opacity;
  }

  :global(.card.enemy) .float.damage,
  :global(.card.enemy) .float.crit {
    color: oklch(0.93 0.07 195);
  }

  :global(.card.player) .float.damage,
  :global(.card.player) .float.crit {
    color: var(--wound);
  }

  .float.crit {
    font-size: 29px;
    animation: crit-pop 1050ms cubic-bezier(0.2, 0.7, 0.4, 1) both;
  }

  .float.heal {
    color: var(--life);
  }

  .float.absorb {
    color: var(--shield);
    font-size: 17px;
  }

  @keyframes float-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 2px) scale(0.6);
    }
    14% {
      opacity: 1;
      transform: translate(-50%, -4px) scale(1.14);
    }
    26% {
      transform: translate(-50%, -8px) scale(1);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -42px) scale(0.95);
    }
  }

  @keyframes crit-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 2px) scale(0.5) rotate(-4deg);
    }
    12% {
      opacity: 1;
      transform: translate(-50%, -6px) scale(1.3) rotate(2deg);
    }
    26% {
      transform: translate(-50%, -10px) scale(1.05) rotate(0);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -52px) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .float {
      animation: none;
      opacity: 0;
    }
  }
</style>
