<script lang="ts">
  import type { CombatantSnapshot, DotSnapshot, Side } from '../../engine'
  import type { FloatText } from '../game.svelte'
  import { ticksToSeconds } from '../format'
  import Bar from './Bar.svelte'
  import AbilityIcon from './icons/AbilityIcon.svelte'
  import GolemPortrait from './portraits/GolemPortrait.svelte'
  import HeroPortrait from './portraits/HeroPortrait.svelte'

  let {
    side,
    name,
    combatant,
    swingProgress = 0,
    dot = null,
    floats = [],
    impact = 0,
    bloom = 0,
  }: {
    side: Side
    name: string
    combatant: CombatantSnapshot
    swingProgress?: number
    dot?: DotSnapshot | null
    floats?: FloatText[]
    impact?: number
    bloom?: number
  } = $props()

  let el: HTMLElement | undefined = $state()

  // Restart the one-shot choreography classes whenever the counters bump.
  function pulse(cls: string) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  $effect(() => {
    if (impact > 0) pulse('hit')
  })

  $effect(() => {
    if (bloom > 0) pulse('bloomed')
  })
</script>

<article class="glass card {side}" class:dead={!combatant.alive} bind:this={el}>
  <div class="body">
    <div class="portrait">
      {#if side === 'player'}
        <HeroPortrait />
      {:else}
        <GolemPortrait />
      {/if}
    </div>

    <div class="info">
      <h3 class="name">{name}</h3>
      <div class="hp-row">
        <span class="hp num">{combatant.hp}</span>
        <span class="hp-max num">/ {combatant.maxHp}</span>
      </div>
      <Bar value={combatant.hp} max={combatant.maxHp} kind="life" label="{name} health" />
      {#if side === 'enemy'}
        <div class="swing-row" class:idle={!combatant.alive}>
          <span class="swing-label">next swing</span>
          <Bar value={swingProgress} max={1} kind="swing" height={7} label="{name} swing windup" />
        </div>
      {/if}
    </div>
  </div>

  {#if dot}
    <span class="dot-chip">
      <span class="dot-icon"><AbilityIcon id={dot.abilityId} /></span>
      <span class="num">{ticksToSeconds(dot.remainingTicks)}s</span>
    </span>
  {/if}

  {#if !combatant.alive}
    <div class="veil">
      <span class="veil-word">{side === 'player' ? 'Fallen' : 'Slain'}</span>
      <span class="veil-count num">{ticksToSeconds(combatant.respawnIn)}s</span>
    </div>
  {/if}

  <!-- floating damage/heal numbers -->
  <div class="fx" aria-hidden="true">
    {#each floats as f (f.id)}
      <span class="float {f.kind}" style:left="{f.x}%">
        {f.kind === 'heal' ? `+${f.amount}` : f.amount}
      </span>
    {/each}
  </div>
</article>

<style>
  .card {
    padding: 22px 24px;
    min-height: 158px;
    transition:
      filter 400ms ease,
      transform 400ms ease,
      opacity 400ms ease;
  }

  .body {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .portrait {
    width: 84px;
    height: 84px;
    flex: none;
    border-radius: 50%;
    padding: 10px;
    background: radial-gradient(circle, oklch(0.8 0.02 260 / 0.07) 0%, transparent 72%);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .name {
    font-size: 21px;
    font-weight: 580;
  }

  .enemy .name {
    color: oklch(0.88 0.04 25);
  }

  .hp-row {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .hp {
    font-size: 17px;
    font-weight: 640;
    color: var(--life);
  }

  .hp-max {
    font-size: 12.5px;
    color: var(--text-dim);
  }

  .swing-row {
    margin-top: 6px;
    display: grid;
    gap: 3px;
    transition: opacity var(--dur) ease;
  }

  .swing-row.idle {
    opacity: 0.35;
  }

  .swing-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .dot-chip {
    position: absolute;
    top: 14px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px 4px 7px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--arcana);
    background: oklch(0.72 0.15 300 / 0.1);
    border: 1px solid oklch(0.72 0.15 300 / 0.3);
    box-shadow: 0 0 14px oklch(0.72 0.15 300 / 0.18);
  }

  .dot-icon {
    width: 14px;
    height: 14px;
  }

  .dead {
    filter: saturate(0.15) brightness(0.72);
    transform: scale(0.985);
  }

  .veil {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: oklch(0.1 0.025 280 / 0.55);
  }

  .veil-word {
    font-family: var(--font-display);
    font-size: 19px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .veil-count {
    font-size: 15px;
    font-weight: 640;
    color: var(--text);
  }

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

  .enemy .float.damage {
    color: oklch(0.93 0.07 195);
  }

  .player .float.damage {
    color: var(--wound);
  }

  .float.heal {
    color: var(--life);
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

  /* one-shot choreography, classes re-armed from script */
  :global(.card.hit) {
    animation: hit-shake 240ms ease-out;
  }

  :global(.card.bloomed) {
    animation: heal-bloom 520ms ease-out;
  }

  @keyframes hit-shake {
    0% {
      transform: translateX(0);
      box-shadow: 0 0 0 1px oklch(0.68 0.17 25 / 0.55), 0 0 22px -4px oklch(0.68 0.17 25 / 0.5);
    }
    25% {
      transform: translateX(-1px);
    }
    50% {
      transform: translateX(1px);
      box-shadow: 0 0 0 1px oklch(0.68 0.17 25 / 0.3), 0 0 16px -6px oklch(0.68 0.17 25 / 0.3);
    }
    75% {
      transform: translateX(-1px);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes heal-bloom {
    0% {
      box-shadow: 0 0 0 1px oklch(0.78 0.15 160 / 0.5), 0 0 26px -4px oklch(0.78 0.15 160 / 0.45);
    }
    100% {
      box-shadow: 0 0 0 1px oklch(0.78 0.15 160 / 0), 0 0 26px -4px oklch(0.78 0.15 160 / 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .float,
    :global(.card.hit),
    :global(.card.bloomed) {
      animation: none;
    }

    .float {
      opacity: 0;
    }
  }
</style>
