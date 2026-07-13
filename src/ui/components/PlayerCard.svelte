<script lang="ts">
  import type { PlayerSnapshot } from '../../engine'
  import type { FloatText } from '../game.svelte'
  import { ticksToSeconds } from '../format'
  import Bar from './Bar.svelte'
  import FloatLayer from './FloatLayer.svelte'
  import HeroPortrait from './portraits/HeroPortrait.svelte'

  let {
    player,
    level,
    floats = [],
    impact = 0,
    bloom = 0,
  }: {
    player: PlayerSnapshot
    level: number
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

  // Respawn: fade-up from the void.
  let wasAlive: boolean | null = null
  $effect(() => {
    const alive = player.alive
    if (alive && wasAlive === false) pulse('reborn')
    wasAlive = alive
  })
</script>

<article class="glass card player" class:dead={!player.alive} bind:this={el}>
  <div class="body">
    <div class="portrait">
      <HeroPortrait />
    </div>

    <div class="info">
      <div class="name-row">
        <h3 class="name">You</h3>
        <span class="level num" title="Level">Lv {level}</span>
      </div>
      <div class="hp-row">
        <span class="hp num">{player.hp}</span>
        <span class="hp-max num">/ {player.maxHp}</span>
        {#if player.shield > 0}
          <span class="shield-chip num" title="Barrier absorb remaining">◈ {player.shield}</span>
        {/if}
      </div>
      <Bar value={player.hp} max={player.maxHp} kind="life" label="Your health" />
      <div class="mana-row">
        <Bar value={player.mana} max={player.maxMana} kind="mana" height={8} label="Your mana" />
        <span class="mana num">{player.mana}</span>
      </div>
    </div>
  </div>

  <!-- buffs & afflictions, space reserved so the card never reflows -->
  <div class="chips">
    {#each player.buffs as buff (buff.id)}
      <span class="chip {buff.id}">
        <span class="chip-name">{buff.id === 'barrier' ? 'Barrier' : 'Combustion'}</span>
        <span class="num">{ticksToSeconds(buff.remainingTicks)}s</span>
      </span>
    {/each}
    {#if player.dot}
      <span class="chip venom">
        <span class="chip-name">{player.dot.name}</span>
        <span class="num">{ticksToSeconds(player.dot.remainingTicks)}s</span>
      </span>
    {/if}
  </div>

  {#if !player.alive}
    <div class="veil">
      <span class="veil-word">Fallen</span>
      <span class="veil-count num">{ticksToSeconds(player.respawnIn)}s</span>
    </div>
  {/if}

  <FloatLayer {floats} />
</article>

<style>
  .card {
    padding: 20px 24px 14px;
    min-height: 178px;
    display: flex;
    flex-direction: column;
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

  .name-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .name {
    font-size: 21px;
    font-weight: 580;
  }

  .level {
    font-size: 11.5px;
    font-weight: 620;
    letter-spacing: 0.08em;
    color: var(--ether);
    border: 1px solid oklch(0.8 0.11 195 / 0.35);
    border-radius: 99px;
    padding: 1px 9px;
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

  .shield-chip {
    margin-left: auto;
    font-size: 12px;
    font-weight: 640;
    color: var(--shield);
  }

  .mana-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
  }

  .mana {
    font-size: 12px;
    font-weight: 620;
    color: var(--mana);
    min-width: 30px;
    text-align: right;
  }

  .chips {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    min-height: 26px; /* reserved — chips fade in without reflow */
    flex-wrap: wrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 11.5px;
    font-weight: 600;
    animation: chip-in 200ms var(--ease-spring) both;
  }

  @keyframes chip-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
  }

  .chip.barrier {
    color: var(--shield);
    background: oklch(0.85 0.06 240 / 0.09);
    border: 1px solid oklch(0.85 0.06 240 / 0.3);
  }

  .chip.combustion {
    color: oklch(0.8 0.15 55);
    background: oklch(0.8 0.15 55 / 0.1);
    border: 1px solid oklch(0.8 0.15 55 / 0.35);
    box-shadow: 0 0 14px oklch(0.8 0.15 55 / 0.2);
  }

  .chip.venom {
    color: oklch(0.78 0.13 130);
    background: oklch(0.78 0.13 130 / 0.08);
    border: 1px solid oklch(0.78 0.13 130 / 0.3);
  }

  .dead {
    filter: saturate(0.12) brightness(0.66);
    transform: scale(0.97) translateY(3px);
  }

  :global(.card.reborn) {
    animation: fade-up 420ms ease-out;
  }

  @keyframes fade-up {
    from {
      opacity: 0.3;
      transform: scale(0.97) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
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
    background: oklch(0.1 0.025 280 / 0.72);
    backdrop-filter: blur(2.5px);
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
    :global(.card.hit),
    :global(.card.bloomed),
    :global(.card.reborn) {
      animation: none;
    }
  }
</style>
