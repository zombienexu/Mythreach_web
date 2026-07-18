<script lang="ts">
  import type { BuffId, ClassId, PlayerSnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Impact } from '../game.svelte'
  import Bar from './Bar.svelte'
  import Filigree from './Filigree.svelte'
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
  const critical = $derived(player.alive && hpFrac < 0.35)

  let el: HTMLElement | undefined = $state()

  // Restart the one-shot choreography classes whenever the counters bump.
  function pulse(cls: string) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  // The blow's weight drives the recoil distance, and a crit gets its own,
  // much more violent choreography.
  $effect(() => {
    if (impact.n === 0 || !el) return
    el.style.setProperty('--power', String(impact.power))
    pulse(impact.crit ? 'crit-hit' : 'hit')
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

<article
  class="glass card player"
  class:dead={!player.alive}
  class:critical
  class:shielded={player.shield > 0}
  data-fx-card="player"
  bind:this={el}
>
  <Filigree />
  <div class="body">
    <div class="portrait" data-fx-anchor="player">
      <HeroPortrait {classId} />
      <!-- Barrier is a thing you can see holding, and see break. -->
      {#if player.shield > 0}
        <span class="shell" aria-hidden="true"></span>
      {/if}
    </div>

    <div class="info">
      <div class="name-row">
        <h3 class="name">{name}</h3>
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

  {#if !player.alive}
    <div class="veil">
      <span class="veil-word">Fallen</span>
      <span class="veil-count num">{ticksToSeconds(player.respawnIn)}s</span>
    </div>
  {/if}
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
    position: relative;
    width: 84px;
    height: 84px;
    flex: none;
    border-radius: 50%;
    padding: 10px;
    background: radial-gradient(circle, oklch(0.8 0.02 260 / 0.07) 0%, transparent 72%);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
  }

  /* A faceted shell of starlight, slowly turning. It reads as *held*. */
  .shell {
    position: absolute;
    inset: -7px;
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
  }

  @keyframes shell-in {
    from {
      opacity: 0;
      transform: scale(1.35);
    }
  }

  @keyframes shell-turn {
    to {
      rotate: 360deg;
    }
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

  .chip {
    --bh: 240;
    color: oklch(0.8 0.12 var(--bh));
    background: oklch(0.8 0.12 var(--bh) / 0.09);
    border: 1px solid oklch(0.8 0.12 var(--bh) / 0.32);
    box-shadow: 0 0 14px oklch(0.8 0.12 var(--bh) / 0.15);
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

  /* Nearly dead: the card itself starts to bleed at the edges. */
  .critical {
    box-shadow:
      0 0 0 1px oklch(0.68 0.17 25 / 0.35),
      0 0 30px -10px oklch(0.68 0.17 25 / 0.5),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
    animation: critical-throb 1.15s ease-in-out infinite;
  }

  @keyframes critical-throb {
    0%,
    100% {
      box-shadow:
        0 0 0 1px oklch(0.68 0.17 25 / 0.25),
        0 0 24px -12px oklch(0.68 0.17 25 / 0.4),
        0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
    }
    22% {
      box-shadow:
        0 0 0 1px oklch(0.68 0.17 25 / 0.6),
        0 0 40px -6px oklch(0.68 0.17 25 / 0.65),
        0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
    }
  }

  /* one-shot choreography, classes re-armed from script.
     A hit is a *recoil*: the body is knocked back and springs in, as far as
     the blow was heavy — --power is set from the impact before arming. */
  .card {
    --power: 1;
    --knock: calc(-9px * var(--power));
  }

  :global(.card.player.hit) {
    animation: recoil-left 300ms var(--ease-punch);
  }

  /* A crit is a different event. The card is *hurled*, overshoots coming back,
     and the whole thing flares white before it settles. */
  :global(.card.player.crit-hit) {
    animation: crit-left 520ms var(--ease-punch);
  }

  :global(.card.bloomed) {
    animation: heal-bloom 520ms ease-out;
  }

  @keyframes recoil-left {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      box-shadow: 0 0 0 2px oklch(0.68 0.17 25 / 0.7), 0 0 34px -4px oklch(0.68 0.17 25 / 0.6);
    }
    18% {
      transform: translate3d(var(--knock), 2px, 0) scale(0.982);
    }
    45% {
      transform: translate3d(4px, -1px, 0) scale(1.006);
      box-shadow: 0 0 0 1px oklch(0.68 0.17 25 / 0.28), 0 0 18px -8px oklch(0.68 0.17 25 / 0.3);
    }
    70% {
      transform: translate3d(-2px, 0, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes crit-left {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(2.6) saturate(0.4);
      box-shadow: 0 0 0 3px oklch(0.95 0.1 30), 0 0 60px 4px oklch(0.7 0.19 28 / 0.9);
    }
    12% {
      transform: translate3d(calc(var(--knock) * 2.1), 5px, 0) scale(0.95) rotate(-1.1deg);
      filter: brightness(1.6);
    }
    34% {
      transform: translate3d(calc(var(--knock) * -0.7), -3px, 0) scale(1.03) rotate(0.6deg);
      filter: brightness(1.15);
      box-shadow: 0 0 0 2px oklch(0.68 0.17 25 / 0.5), 0 0 34px -2px oklch(0.68 0.17 25 / 0.55);
    }
    56% {
      transform: translate3d(calc(var(--knock) * 0.35), 1px, 0) scale(0.995) rotate(-0.25deg);
    }
    78% {
      transform: translate3d(-2px, 0, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1);
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
    :global(.card.player.hit),
    :global(.card.player.crit-hit),
    :global(.card.bloomed),
    :global(.card.reborn),
    .critical,
    .shell {
      animation: none;
    }
  }
</style>
