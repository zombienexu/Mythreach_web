<script lang="ts">
  import type { BuffId, ClassId, PlayerSnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Impact } from '../game.svelte'
  import HeroPortrait from './portraits/HeroPortrait.svelte'

  let {
    player,
    level,
    impact,
    bloom = 0,
    name = 'You',
    classId = 'arcanist',
  }: {
    player: PlayerSnapshot
    level: number
    impact: Impact
    bloom?: number
    name?: string
    classId?: ClassId
  } = $props()

  /** Chip copy for every buff in the game — a new buff is a row, not a fork. */
  const BUFF_NAMES: Record<BuffId, string> = {
    barrier: 'Barrier',
    combustion: 'Combustion',
    splitSecond: 'Split Second',
    houseRules: 'House Rules',
    wildswell: 'Wildswell',
    seamstep: 'Seamstep',
    doorway: 'Doorway Duel',
  }

  /** Each buff's chip hue (oklch angle) — barrier stays its icy self. */
  const BUFF_HUES: Record<BuffId, number> = {
    barrier: 240,
    combustion: 55,
    splitSecond: 240,
    houseRules: 80,
    wildswell: 150,
    seamstep: 305,
    doorway: 305,
  }

  const hpFrac = $derived(player.maxHp > 0 ? player.hp / player.maxHp : 1)
  const manaFrac = $derived(player.maxMana > 0 ? player.mana / player.maxMana : 1)
  const critical = $derived(player.alive && hpFrac < 0.35)

  let el: HTMLElement | undefined = $state()

  function pulse(cls: string) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  $effect(() => {
    if (impact.n === 0 || !el) return
    el.style.setProperty('--power', String(impact.power))
    pulse(impact.crit ? 'crit-hit' : 'hit')
  })

  $effect(() => {
    if (bloom > 0) pulse('bloomed')
  })

  let wasAlive: boolean | null = null
  $effect(() => {
    const alive = player.alive
    if (alive && wasAlive === false) pulse('reborn')
    wasAlive = alive
  })
</script>

<div class="hud" class:dead={!player.alive} class:critical data-fx-card="player" bind:this={el} aria-label="Your vitals">
  <div class="orb-wrap" data-fx-anchor="player">
    <svg class="vitals" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="track" cx="60" cy="60" r="55" pathLength="100" />
      <circle class="arc hp" cx="60" cy="60" r="55" pathLength="100" style:stroke-dasharray="{hpFrac * 100} 100" />
      <circle class="track thin" cx="60" cy="60" r="48.5" pathLength="100" />
      <circle class="arc mana" cx="60" cy="60" r="48.5" pathLength="100" style:stroke-dasharray="{manaFrac * 100} 100" />
    </svg>

    <div class="orb">
      <HeroPortrait {classId} />
    </div>

    {#if player.shield > 0}
      <span class="shell" aria-hidden="true"></span>
    {/if}

    {#if !player.alive}
      <div class="veil">
        <span class="veil-word">Fallen</span>
        <span class="veil-count num">{ticksToSeconds(player.respawnIn)}s</span>
      </div>
    {/if}
  </div>

  <div class="scroll">
    <div class="name-row">
      <h3 class="name">{name}</h3>
      <span class="level num" title="Level">Lv {level}</span>
    </div>
    <div class="vital-row">
      <span class="hp-num num">{player.hp}</span>
      <span class="dim num">/ {player.maxHp}</span>
      {#if player.shield > 0}
        <span class="shield-chip num" title="Barrier absorb remaining">◈ {player.shield}</span>
      {/if}
    </div>
    <div class="vital-row">
      <span class="mana-num num">{player.mana}</span>
      <span class="dim num">/ {player.maxMana}</span>
    </div>

    <!-- buffs & afflictions; space reserved so the helm never reflows -->
    <div class="chips">
      {#each player.buffs as buff (buff.id)}
        <span class="chip" style:--bh={BUFF_HUES[buff.id]}>
          <span class="chip-name">{BUFF_NAMES[buff.id]}</span>
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
  </div>
</div>

<style>
  .hud {
    display: flex;
    align-items: center;
    gap: 16px;
    transition:
      filter 400ms ease,
      opacity 400ms ease;
  }

  .orb-wrap {
    position: relative;
    width: 128px;
    height: 128px;
    flex: none;
  }

  .vitals {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
  }

  .track {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.1);
    stroke-width: 3;
  }

  .track.thin {
    stroke-width: 2;
  }

  .arc {
    fill: none;
    stroke-linecap: round;
    transition: stroke-dasharray 220ms ease;
  }

  .arc.hp {
    stroke: var(--life);
    stroke-width: 3.5;
    filter: drop-shadow(0 0 6px oklch(0.78 0.15 160 / 0.55));
  }

  .critical .arc.hp {
    stroke: var(--wound);
    filter: drop-shadow(0 0 8px oklch(0.68 0.17 25 / 0.75));
    animation: hp-throb 1.15s ease-in-out infinite;
  }

  @keyframes hp-throb {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }

  .arc.mana {
    stroke: var(--mana);
    stroke-width: 2.5;
    filter: drop-shadow(0 0 5px oklch(0.72 0.12 240 / 0.5));
  }

  .orb {
    position: absolute;
    inset: 17px;
    border-radius: 50%;
    padding: 10px;
    background: radial-gradient(circle, oklch(0.8 0.02 260 / 0.08) 0%, transparent 72%);
  }

  /* A faceted shell of starlight, slowly turning. It reads as *held*. */
  .shell {
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    border: 1.5px solid oklch(0.85 0.06 240 / 0.55);
    box-shadow:
      inset 0 0 18px oklch(0.85 0.06 240 / 0.28),
      0 0 22px -2px oklch(0.85 0.06 240 / 0.45);
    background: conic-gradient(
      from 0deg,
      oklch(0.85 0.06 240 / 0.02),
      oklch(0.9 0.08 240 / 0.22),
      oklch(0.85 0.06 240 / 0.02),
      oklch(0.9 0.08 240 / 0.2),
      oklch(0.85 0.06 240 / 0.02)
    );
    animation:
      shell-in 260ms var(--ease-spring) both,
      shell-turn 7s linear infinite;
    pointer-events: none;
  }

  @keyframes shell-in {
    from {
      opacity: 0;
      scale: 1.35;
    }
  }

  @keyframes shell-turn {
    to {
      rotate: 360deg;
    }
  }

  .veil {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    background: oklch(0.1 0.025 280 / 0.72);
    backdrop-filter: blur(2.5px);
  }

  .veil-word {
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .veil-count {
    font-size: 14px;
    font-weight: 640;
    color: var(--text);
  }

  .scroll {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 128px;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    font-size: 18px;
    font-weight: 580;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .level {
    font-size: 10.5px;
    font-weight: 620;
    letter-spacing: 0.08em;
    color: var(--ether);
  }

  .vital-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .hp-num {
    font-size: 15px;
    font-weight: 640;
    color: var(--life);
  }

  .mana-num {
    font-size: 12.5px;
    font-weight: 620;
    color: var(--mana);
  }

  .dim {
    font-size: 11px;
    color: var(--text-dim);
  }

  .shield-chip {
    margin-left: 6px;
    font-size: 11.5px;
    font-weight: 640;
    color: var(--shield);
  }

  .chips {
    display: flex;
    gap: 5px;
    margin-top: 4px;
    min-height: 24px; /* reserved — chips fade in without reflow */
    flex-wrap: wrap;
    max-width: 220px;
  }

  .chip {
    --bh: 240;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: 99px;
    font-size: 10.5px;
    font-weight: 600;
    color: oklch(0.8 0.12 var(--bh));
    background: oklch(0.8 0.12 var(--bh) / 0.09);
    border: 1px solid oklch(0.8 0.12 var(--bh) / 0.32);
    box-shadow: 0 0 14px oklch(0.8 0.12 var(--bh) / 0.15);
    animation: chip-in 200ms var(--ease-spring) both;
  }

  @keyframes chip-in {
    from {
      opacity: 0;
      scale: 0.8;
    }
  }

  .chip.venom {
    color: oklch(0.78 0.13 130);
    background: oklch(0.78 0.13 130 / 0.08);
    border: 1px solid oklch(0.78 0.13 130 / 0.3);
  }

  .dead {
    filter: saturate(0.12) brightness(0.66);
  }

  /* ---- one-shot choreography ---------------------------------------- */

  .hud {
    --power: 1;
    --knock: calc(-9px * var(--power));
  }

  :global(.hud.hit) {
    animation: recoil-left 300ms var(--ease-punch);
  }

  :global(.hud.crit-hit) {
    animation: crit-left 520ms var(--ease-punch);
  }

  :global(.hud.bloomed) .orb-wrap {
    animation: heal-bloom 520ms ease-out;
  }

  :global(.hud.reborn) {
    animation: fade-up 420ms ease-out;
  }

  @keyframes fade-up {
    from {
      opacity: 0.3;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes recoil-left {
    0% {
      transform: translate3d(0, 0, 0);
      filter: brightness(1.6);
    }
    18% {
      transform: translate3d(var(--knock), 2px, 0);
    }
    45% {
      transform: translate3d(4px, -1px, 0);
      filter: brightness(1.1);
    }
    70% {
      transform: translate3d(-2px, 0, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
      filter: brightness(1);
    }
  }

  @keyframes crit-left {
    0% {
      transform: translate3d(0, 0, 0);
      filter: brightness(2.6) saturate(0.4) drop-shadow(0 0 26px oklch(0.7 0.19 28 / 0.9));
    }
    12% {
      transform: translate3d(calc(var(--knock) * 2.1), 5px, 0) rotate(-1.1deg);
      filter: brightness(1.6);
    }
    34% {
      transform: translate3d(calc(var(--knock) * -0.7), -3px, 0) rotate(0.6deg);
      filter: brightness(1.15) drop-shadow(0 0 14px oklch(0.68 0.17 25 / 0.55));
    }
    56% {
      transform: translate3d(calc(var(--knock) * 0.35), 1px, 0) rotate(-0.25deg);
    }
    78% {
      transform: translate3d(-2px, 0, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
      filter: brightness(1);
    }
  }

  @keyframes heal-bloom {
    0% {
      filter: drop-shadow(0 0 18px oklch(0.78 0.15 160 / 0.6));
    }
    100% {
      filter: drop-shadow(0 0 0 oklch(0.78 0.15 160 / 0));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.hud.hit),
    :global(.hud.crit-hit),
    :global(.hud.bloomed) .orb-wrap,
    :global(.hud.reborn),
    .critical .arc.hp,
    .shell {
      animation: none;
    }
  }
</style>
