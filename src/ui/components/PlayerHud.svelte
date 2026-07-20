<script lang="ts">
  import type { BuffId, ClassId, PlayerSnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Impact } from '../game.svelte'
  import HeroPortrait from './portraits/HeroPortrait.svelte'

  let {
    player,
    level,
    xp,
    xpToNext,
    impact,
    bloom = 0,
    name = 'You',
    classId = 'arcanist',
    variant = 'corner',
    faded = false,
  }: {
    player: PlayerSnapshot
    level: number
    xp: number
    xpToNext: number
    impact: Impact
    bloom?: number
    name?: string
    classId?: ClassId
    /** `corner` = the permanent bottom-left HUD (menus/other tabs). `deck` = the
     *  combat station, standing in-flow beside the ability bar; it owns the FX
     *  anchor and animates in on mount. */
    variant?: 'corner' | 'deck'
    /** Corner only: fade out (e.g. while the Arena's deck portrait holds the field). */
    faded?: boolean
  } = $props()

  const BUFF_NAMES: Record<BuffId, string> = {
    barrier: 'Barrier',
    combustion: 'Combustion',
    splitSecond: 'Split Second',
    houseRules: 'House Rules',
    wildswell: 'Wildswell',
    seamstep: 'Seamstep',
    doorway: 'Doorway Duel',
  }
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
  const xpFrac = $derived(xpToNext > 0 ? Math.max(0, Math.min(1, xp / xpToNext)) : 0)
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

<div
  class="phud {variant}"
  class:faded
  class:dead={!player.alive}
  class:critical
  data-fx-card={variant === 'deck' ? 'player' : undefined}
  bind:this={el}
  aria-label="Your vitals"
  aria-hidden={faded}
>
  <div class="cluster">
    <div class="orb-wrap" data-fx-anchor={variant === 'deck' ? 'player' : undefined}>
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="ring-track" cx="60" cy="60" r="55" pathLength="100" />
        <circle class="ring-xp" cx="60" cy="60" r="55" pathLength="100" style:stroke-dasharray="{xpFrac * 100} 100" />
      </svg>

      <div class="orb"><HeroPortrait {classId} /></div>

      {#if player.shield > 0}<span class="shell" aria-hidden="true"></span>{/if}

      <span class="level-badge num" title="Standing {xp}/{xpToNext} XP">{level}</span>

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
        {#if player.shield > 0}<span class="shield-chip num" title="Barrier absorb">◈ {player.shield}</span>{/if}
      </div>

      <!-- HP: the loud one -->
      <div class="bar-row hp-row">
        <div class="bar hp-bar" class:crit={critical}>
          <span class="fill hp-fill" style:width="{hpFrac * 100}%"></span>
          {#if player.shield > 0}
            <span class="fill shield-fill" style:left="{hpFrac * 100}%" style:width="{shieldFrac * 100}%"></span>
          {/if}
        </div>
        <span class="bar-num hp-num num">{player.hp}<span class="slash">/{player.maxHp}</span></span>
      </div>

      <!-- Mana: the quiet one -->
      <div class="bar-row mana-row">
        <div class="bar mana-bar">
          <span class="fill mana-fill" style:width="{manaFrac * 100}%"></span>
        </div>
        <span class="bar-num mana-num num">{player.mana}<span class="slash">/{player.maxMana}</span></span>
      </div>

      <div class="chips">
        {#each player.buffs as buff (buff.id)}
          <span class="chip" style:--bh={BUFF_HUES[buff.id]}>
            <span class="chip-dot"></span>{BUFF_NAMES[buff.id]}<span class="num">{ticksToSeconds(buff.remainingTicks)}s</span>
          </span>
        {/each}
        {#if player.dot}
          <span class="chip venom"><span class="chip-dot"></span>{player.dot.name}<span class="num">{ticksToSeconds(player.dot.remainingTicks)}s</span></span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .phud {
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition:
      filter 400ms ease,
      opacity 400ms ease;
  }

  /* corner: the permanent bottom-left HUD, pinned to the viewport */
  .phud.corner {
    position: fixed;
    left: 18px;
    bottom: 16px;
    z-index: 30;
    pointer-events: none;
    transition: opacity 360ms var(--ease-out-expo);
  }
  .phud.corner > * {
    pointer-events: auto;
  }
  /* while the Arena's deck portrait holds the field, the corner one fades away */
  .phud.corner.faded {
    opacity: 0;
    pointer-events: none;
    transform: translateY(6px);
  }

  /* deck: stands in the combat bar's flow, beside the abilities */
  .phud.deck {
    position: relative;
  }
  /* it animates in with the rising deck, taking its combat station */
  .phud.deck .cluster {
    animation: portrait-enter 640ms 160ms var(--ease-out-expo) both;
  }
  @keyframes portrait-enter {
    0% {
      opacity: 0;
      transform: translateY(46px) scale(0.78);
      filter: blur(6px) brightness(1.5);
    }
    58% {
      filter: blur(0) brightness(1.2);
    }
    78% {
      transform: translateY(-5px) scale(1.04);
    }
    100% {
      opacity: 1;
      transform: none;
      filter: none;
    }
  }

  /* ---- the portrait cluster ------------------------------------------ */
  .cluster {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 10px 16px 10px 10px;
    border-radius: 16px;
    background:
      radial-gradient(90% 120% at 12% 90%, oklch(0.6 0.08 300 / 0.14), transparent 70%),
      linear-gradient(180deg, oklch(0.13 0.03 300 / 0.35), oklch(0.09 0.035 305 / 0.62));
    border: 1px solid oklch(0.78 0.08 82 / 0.12);
    backdrop-filter: blur(var(--glass-blur, 14px));
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.05),
      0 12px 34px -20px oklch(0.03 0.02 280 / 0.9);
  }

  .orb-wrap {
    position: relative;
    width: 92px;
    height: 92px;
    flex: none;
  }
  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
  }
  .ring-track {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.12);
    stroke-width: 3.5;
  }
  .ring-xp {
    fill: none;
    stroke: var(--xp, oklch(0.72 0.15 300));
    stroke-width: 4;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px oklch(0.72 0.15 300 / 0.6));
    transition: stroke-dasharray 400ms var(--ease-out-expo);
  }

  .orb {
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    padding: 8px;
    background:
      radial-gradient(circle, oklch(0.8 0.02 260 / 0.12) 0%, transparent 72%),
      oklch(0.09 0.035 305 / 0.6);
    border: 1px solid oklch(0.85 0.03 260 / 0.12);
    overflow: hidden;
  }

  .level-badge {
    position: absolute;
    bottom: -2px;
    left: 50%;
    translate: -50% 0;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    display: grid;
    place-items: center;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 720;
    color: var(--void-deep);
    background: linear-gradient(180deg, oklch(0.82 0.13 300), oklch(0.68 0.16 300));
    border: 1.5px solid oklch(0.12 0.03 305);
    box-shadow: 0 0 12px oklch(0.72 0.15 300 / 0.55);
  }

  .shell {
    position: absolute;
    inset: 6px;
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
    inset: 12px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    background: oklch(0.1 0.025 280 / 0.74);
    backdrop-filter: blur(2.5px);
  }
  .veil-word {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }
  .veil-count {
    font-size: 12px;
    font-weight: 640;
    color: var(--text);
  }

  /* ---- vitals readout ------------------------------------------------ */
  .readout {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 168px;
    padding-bottom: 4px;
  }
  .name-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .name {
    font-size: 15px;
    font-weight: 580;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  .shield-chip {
    font-size: 11px;
    font-weight: 640;
    color: var(--shield);
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bar {
    position: relative;
    flex: 1;
    border-radius: 8px;
    background: oklch(0.05 0.02 290 / 0.72);
    border: 1px solid oklch(0.85 0.03 260 / 0.14);
    overflow: hidden;
    box-shadow: inset 0 1px 3px oklch(0.02 0.01 280 / 0.8);
  }
  /* HP is the loud one: taller, brighter, bigger numerals */
  .hp-bar {
    height: 20px;
  }
  .mana-bar {
    height: 11px;
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
    background: linear-gradient(90deg, oklch(0.66 0.16 156), var(--life));
    box-shadow: 0 0 14px -2px oklch(0.78 0.15 160 / 0.8);
  }
  .hp-bar.crit .hp-fill {
    background: linear-gradient(90deg, oklch(0.6 0.17 25), var(--wound));
    box-shadow: 0 0 16px -1px oklch(0.68 0.17 25 / 0.9);
    animation: hp-throb 1.05s ease-in-out infinite;
  }
  @keyframes hp-throb {
    50% {
      filter: brightness(1.4);
    }
  }
  .shield-fill {
    background: repeating-linear-gradient(-45deg, oklch(0.85 0.06 240 / 0.55) 0 5px, oklch(0.85 0.06 240 / 0.3) 5px 10px);
    border-left: 1px solid oklch(0.9 0.06 240 / 0.7);
    transition:
      width 240ms var(--ease-out-expo),
      left 240ms var(--ease-out-expo);
  }
  .shield-fill::after {
    content: none;
  }
  .mana-fill {
    background: linear-gradient(90deg, oklch(0.6 0.12 244), var(--mana));
    box-shadow: 0 0 8px -2px oklch(0.72 0.12 240 / 0.5);
    opacity: 0.9;
  }

  .bar-num {
    flex: none;
    text-align: right;
    font-weight: 660;
    color: var(--text);
    text-shadow: 0 1px 3px oklch(0.03 0.01 280 / 0.9);
  }
  .hp-num {
    font-size: 14px;
    min-width: 62px;
    color: var(--life);
  }
  .mana-num {
    font-size: 10.5px;
    min-width: 56px;
    color: var(--mana);
    opacity: 0.9;
  }
  .slash {
    font-weight: 500;
    opacity: 0.6;
    margin-left: 1px;
    color: var(--text-dim);
  }

  .chips {
    display: flex;
    gap: 4px;
    margin-top: 3px;
    min-height: 20px;
    flex-wrap: wrap;
    max-width: 244px;
  }
  .chip {
    --bh: 240;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 600;
    color: oklch(0.82 0.12 var(--bh));
    background: oklch(0.8 0.12 var(--bh) / 0.1);
    border: 1px solid oklch(0.8 0.12 var(--bh) / 0.34);
    box-shadow: 0 0 12px oklch(0.8 0.12 var(--bh) / 0.16);
    animation: chip-in 200ms var(--ease-spring) both;
  }
  .chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: oklch(0.82 0.13 var(--bh));
    box-shadow: 0 0 6px oklch(0.82 0.13 var(--bh) / 0.85);
  }
  .chip.venom {
    --bh: 130;
  }
  @keyframes chip-in {
    from {
      opacity: 0;
      scale: 0.8;
    }
  }

  .dead {
    filter: saturate(0.12) brightness(0.7);
  }

  /* ---- one-shot choreography (recoil / heal / rebirth) --------------- */
  .phud {
    --power: 1;
    --knock: calc(-8px * var(--power));
  }
  :global(.phud.hit) {
    animation: recoil 300ms var(--ease-punch);
  }
  :global(.phud.crit-hit) {
    animation: recoil-hard 520ms var(--ease-punch);
  }
  :global(.phud.bloomed) .orb-wrap {
    animation: heal-bloom 520ms ease-out;
  }
  :global(.phud.reborn) {
    animation: fade-up 420ms ease-out;
  }
  @keyframes fade-up {
    from {
      opacity: 0.3;
      transform: translateY(8px);
    }
  }

  /* deck entrance: the standing ring charges from empty as the portrait lands.
     No fill mode — after it plays, the inline stroke-dasharray (live XP) takes
     back over and future gains animate via the .ring-xp transition. */
  .phud.deck .ring-xp {
    animation: ring-charge 720ms 160ms var(--ease-out-expo);
  }
  @keyframes ring-charge {
    from {
      stroke-dasharray: 0 100;
      filter: drop-shadow(0 0 14px oklch(0.82 0.16 300));
    }
  }
  @keyframes recoil {
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
    100% {
      transform: translate3d(0, 0, 0);
      filter: brightness(1);
    }
  }
  @keyframes recoil-hard {
    0% {
      transform: translate3d(0, 0, 0);
      filter: brightness(2.4) saturate(0.4) drop-shadow(0 0 22px oklch(0.7 0.19 28 / 0.9));
    }
    14% {
      transform: translate3d(calc(var(--knock) * 2), 5px, 0) rotate(-1deg);
      filter: brightness(1.5);
    }
    40% {
      transform: translate3d(calc(var(--knock) * -0.6), -3px, 0) rotate(0.5deg);
      filter: brightness(1.1);
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

  @media (max-width: 1000px) {
    .cluster {
      gap: 9px;
      padding: 8px 12px 8px 8px;
    }
    .readout {
      min-width: 140px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.phud.hit),
    :global(.phud.crit-hit),
    :global(.phud.bloomed) .orb-wrap,
    :global(.phud.reborn),
    .hp-bar.crit .hp-fill,
    .shell {
      animation: none;
    }
  }
</style>
