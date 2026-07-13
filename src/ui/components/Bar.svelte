<script lang="ts">
  type Kind = 'life' | 'cast' | 'swing' | 'mana' | 'xp' | 'enemycast'

  let {
    value,
    max,
    kind = 'life',
    label,
    height = 14,
  }: {
    value: number
    max: number
    kind?: Kind
    label: string
    height?: number
  } = $props()

  const pct = $derived(max > 0 ? Math.min(1, Math.max(0, value / max)) : 0)
</script>

<div
  class="bar {kind}"
  style:height="{height}px"
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={Math.round(value)}
  aria-label={label}
>
  <!-- brighter "loss" layer drains late, fighting-game style -->
  <div class="loss" style:width="{pct * 100}%"></div>
  <div class="fill" style:width="{pct * 100}%">
    <div class="sheen"></div>
  </div>
</div>

<style>
  .bar {
    position: relative;
    border-radius: 99px;
    background: oklch(0.2 0.02 270 / 0.75);
    box-shadow: inset 0 1px 3px oklch(0.05 0.02 280 / 0.7);
    overflow: hidden;
  }

  .loss,
  .fill {
    position: absolute;
    inset-block: 0;
    left: 0;
    border-radius: inherit;
    min-width: 0;
  }

  /* The loss layer trails the fill on the way down, exposing a bright segment. */
  .loss {
    transition: width 420ms ease 160ms;
  }

  .fill {
    transition: width 120ms ease-out;
    overflow: hidden;
  }

  /* Leading-edge inner glow */
  .fill::after {
    content: '';
    position: absolute;
    right: -2px;
    top: -30%;
    bottom: -30%;
    width: 14px;
    border-radius: 50%;
    filter: blur(4px);
  }

  .sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, oklch(1 0 0 / 0.22) 50%, transparent 70%);
    background-size: 260% 100%;
    animation: sheen 6.5s ease-in-out infinite;
  }

  @keyframes sheen {
    0%,
    55% {
      background-position: 130% 0;
    }
    95%,
    100% {
      background-position: -130% 0;
    }
  }

  .life .fill {
    background: linear-gradient(90deg, oklch(0.55 0.13 165), var(--life));
  }
  .life .fill::after {
    background: var(--life);
  }
  .life .loss {
    background: oklch(0.88 0.12 155);
  }

  .cast .fill {
    background: linear-gradient(90deg, var(--ether), var(--arcana));
  }
  .cast .fill::after {
    background: var(--arcana);
  }
  .cast .loss {
    display: none;
  }

  .swing .fill {
    background: linear-gradient(90deg, oklch(0.45 0.13 25), var(--wound));
  }
  .swing .fill::after {
    background: var(--wound);
  }
  .swing .loss {
    display: none;
  }

  .mana .fill {
    background: linear-gradient(90deg, oklch(0.5 0.11 250), var(--mana));
  }
  .mana .fill::after {
    background: var(--mana);
  }
  .mana .loss {
    display: none;
  }

  .xp .fill {
    background: linear-gradient(90deg, oklch(0.5 0.13 305), var(--xp));
  }
  .xp .fill::after {
    background: var(--xp);
  }
  .xp .loss {
    display: none;
  }

  /* enemy hardcast: reads as danger, not as the player's ether cast */
  .enemycast .fill {
    background: linear-gradient(90deg, oklch(0.55 0.14 45), oklch(0.75 0.15 65));
  }
  .enemycast .fill::after {
    background: oklch(0.75 0.15 65);
  }
  .enemycast .loss {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .sheen {
      animation: none;
    }
  }
</style>
