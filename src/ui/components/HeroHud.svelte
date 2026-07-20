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
  const shieldFrac = $derived(player.maxHp > 0 ? Math.min(1, player.shield / player.maxHp) : 0)
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
    <span class="orb-ring" aria-hidden="true"></span>
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

  <div class="readout">
    <div class="name-row">
      <h3 class="name">{name}</h3>
      <span class="level num" title="Standing">Lv {level}</span>
    </div>

    <!-- HP -->
    <div class="bar-row">
      <span class="glyph hp" aria-hidden="true">♥</span>
      <div class="bar hp-bar" class:crit={critical}>
        <span class="fill hp-fill" style:width="{hpFrac * 100}%"></span>
        {#if player.shield > 0}
          <span class="fill shield-fill" style:left="{hpFrac * 100}%" style:width="{shieldFrac * 100}%"></span>
        {/if}
        <span class="bar-text num">
          {player.hp}<span class="slash">/{player.maxHp}</span>
          {#if player.shield > 0}<span class="shield-inline">◈{player.shield}</span>{/if}
        </span>
      </div>
    </div>

    <!-- Mana -->
    <div class="bar-row">
      <span class="glyph mana" aria-hidden="true">✦</span>
      <div class="bar mana-bar">
        <span class="fill mana-fill" style:width="{manaFrac * 100}%"></span>
        <span class="bar-text num">{player.mana}<span class="slash">/{player.maxMana}</span></span>
      </div>
    </div>

    <!-- buffs & afflictions; space reserved so the helm never reflows -->
    <div class="chips">
      {#each player.buffs as buff (buff.id)}
        <span class="chip" style:--bh={BUFF_HUES[buff.id]}>
          <span class="chip-dot"></span>
          <span class="chip-name">{BUFF_NAMES[buff.id]}</span>
          <span class="num">{ticksToSeconds(buff.remainingTicks)}s</span>
        </span>
      {/each}
      {#if player.dot}
        <span class="chip venom">
          <span class="chip-dot"></span>
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
    gap: 12px;
    min-width: 0;
    width: 100%;
    transition:
      filter 400ms ease,
      opacity 400ms ease;
  }

  .orb-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    flex: none;
  }

  .orb-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid oklch(0.78 0.08 82 / 0.32);
    background: radial-gradient(circle, transparent 58%, oklch(0.6 0.08 300 / 0.12) 92%, transparent 100%);
    box-shadow:
      inset 0 0 20px -6px oklch(0.7 0.1 300 / 0.5),
      0 6px 18px -10px oklch(0.05 0.02 280 / 0.9);
  }

  .orb {
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    padding: 8px;
    background: radial-gradient(circle, oklch(0.8 0.02 260 / 0.1) 0%, transparent 72%);
  }

  /* A faceted shell of starlight, slowly turning. It reads as *held*. */
  .shell {
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 1.5px solid oklch(0.85 0.06 240 / 0.55);
    box-shadow:
      inset 0 0 16px oklch(0.85 0.06 240 / 0.28),
      0 0 20px -2px oklch(0.85 0.06 240 / 0.45);
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
    inset: 3px;
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
    font-size: 13px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }
  .veil-count {
    font-size: 13px;
    font-weight: 640;
    color: var(--text);
  }

  .readout {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 148px;
    max-width: 210px;
    flex: 1;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .name {
    font-size: 16px;
    font-weight: 580;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 170px;
  }
  .level {
    font-size: 10px;
    font-weight: 620;
    letter-spacing: 0.08em;
    color: var(--ether);
  }

  /* ---- vital bars ---------------------------------------------------- */
  .bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .glyph {
    width: 14px;
    font-size: 13px;
    text-align: center;
    flex: none;
  }
  .glyph.hp {
    color: var(--life);
  }
  .glyph.mana {
    color: var(--mana);
    font-size: 11px;
  }

  .bar {
    position: relative;
    flex: 1;
    height: 16px;
    border-radius: 8px;
    background: oklch(0.05 0.02 290 / 0.7);
    border: 1px solid oklch(0.85 0.03 260 / 0.14);
    overflow: hidden;
    box-shadow: inset 0 1px 3px oklch(0.02 0.01 280 / 0.8);
  }
  .mana-bar {
    height: 13px;
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: inherit;
    transition: width 240ms var(--ease-out-expo);
  }
  .fill::after {
    content: '';
    position: absolute;
    inset: 0 0 50% 0;
    border-radius: inherit;
    background: linear-gradient(180deg, oklch(1 0 0 / 0.22), transparent);
  }

  .hp-fill {
    background: linear-gradient(90deg, oklch(0.68 0.15 158), var(--life));
    box-shadow: 0 0 12px -2px oklch(0.78 0.15 160 / 0.7);
  }
  .hp-bar.crit .hp-fill {
    background: linear-gradient(90deg, oklch(0.6 0.17 25), var(--wound));
    box-shadow: 0 0 14px -1px oklch(0.68 0.17 25 / 0.85);
    animation: hp-throb 1.05s ease-in-out infinite;
  }
  @keyframes hp-throb {
    50% {
      filter: brightness(1.4);
    }
  }

  .shield-fill {
    background: repeating-linear-gradient(
      -45deg,
      oklch(0.85 0.06 240 / 0.55) 0 5px,
      oklch(0.85 0.06 240 / 0.3) 5px 10px
    );
    border-left: 1px solid oklch(0.9 0.06 240 / 0.7);
    transition:
      width 240ms var(--ease-out-expo),
      left 240ms var(--ease-out-expo);
  }
  .shield-fill::after {
    content: none;
  }

  .mana-fill {
    background: linear-gradient(90deg, oklch(0.62 0.12 242), var(--mana));
    box-shadow: 0 0 10px -2px oklch(0.72 0.12 240 / 0.6);
  }

  .bar-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding-right: 8px;
    font-size: 10.5px;
    font-weight: 660;
    color: var(--text);
    text-shadow: 0 1px 3px oklch(0.03 0.01 280 / 0.95);
    pointer-events: none;
  }
  .slash {
    font-weight: 500;
    opacity: 0.6;
    margin-left: 1px;
  }
  .shield-inline {
    color: var(--shield);
    font-weight: 660;
  }

  /* ---- chips --------------------------------------------------------- */
  .chips {
    display: flex;
    gap: 5px;
    margin-top: 2px;
    min-height: 22px; /* reserved — chips fade in without reflow */
    flex-wrap: wrap;
    max-width: 260px;
  }
  .chip {
    --bh: 240;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 600;
    color: oklch(0.82 0.12 var(--bh));
    background: oklch(0.8 0.12 var(--bh) / 0.1);
    border: 1px solid oklch(0.8 0.12 var(--bh) / 0.34);
    box-shadow: 0 0 14px oklch(0.8 0.12 var(--bh) / 0.16);
    animation: chip-in 200ms var(--ease-spring) both;
  }
  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: oklch(0.82 0.13 var(--bh));
    box-shadow: 0 0 7px oklch(0.82 0.13 var(--bh) / 0.85);
  }
  @keyframes chip-in {
    from {
      opacity: 0;
      scale: 0.8;
    }
  }
  .chip.venom {
    --bh: 130;
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
    .hp-bar.crit .hp-fill,
    .shell {
      animation: none;
    }
  }
</style>
