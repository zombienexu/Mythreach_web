<script lang="ts">
  import type { EnemySnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Impact } from '../game.svelte'
  import Bar from './Bar.svelte'
  import AbilityIcon from './icons/AbilityIcon.svelte'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'

  let {
    enemy,
    live = true,
    targeted = false,
    compact = false,
    impact,
    ontarget,
  }: {
    enemy: EnemySnapshot
    /** false once the pack is cleared — the card is a corpse awaiting the next spawn */
    live?: boolean
    targeted?: boolean
    /** packs shrink every card so three fit where one stood */
    compact?: boolean
    impact: Impact
    ontarget?: () => void
  } = $props()

  const dead = $derived(!enemy.alive || !live)
  const casting = $derived(live && enemy.alive && enemy.cast != null)

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

  // Arriving out of the dark, as the motes converge. Guarded by the last iid:
  // the snapshot object is rebuilt every tick, and re-arming the animation
  // each tick would hold the card at frame zero — invisible — forever.
  let lastIid: number | null = null
  $effect(() => {
    if (enemy.iid !== lastIid) {
      lastIid = enemy.iid
      pulse('reborn')
    }
  })

  function select(): void {
    if (!dead) ontarget?.()
  }
</script>

<div
  class="glass card enemy"
  class:dead
  class:compact
  class:targeted={targeted && !dead}
  class:enraged={!dead && enemy.enraged}
  class:boss={enemy.rank === 'boss'}
  class:back={enemy.row === 'back'}
  class:casting
  data-fx-card="enemy"
  data-iid={enemy.iid}
  bind:this={el}
  onclick={() => {
    select()
    // A pointer click must not leave a focus ring that reads as a second
    // reticle; Tab (remapped to target-cycling) is the keyboard path.
    el?.blur()
  }}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select()
    }
  }}
  role="button"
  tabindex={dead ? -1 : 0}
  aria-pressed={targeted && !dead}
  aria-label="Target {enemy.name}"
>
  {#if targeted && !dead}
    <span class="reticle" aria-hidden="true"></span>
  {/if}

  <div class="body">
    <div class="portrait" data-fx-anchor="enemy">
      <EnemyPortrait
        family={enemy.portrait.family}
        hue={enemy.portrait.hue}
        name={enemy.name}
        enraged={!dead && enemy.enraged}
      />
    </div>

    <div class="info">
      <div class="name-row">
        <h3 class="name">{enemy.name}</h3>
        <span class="tags">
          {#if enemy.rank === 'elite'}<span class="rank elite">Elite</span>{/if}
          {#if enemy.rank === 'boss'}<span class="rank bossy">Boss</span>{/if}
          {#if enemy.row === 'back' && !compact}<span class="rank backrow">Back</span>{/if}
          <span class="level num">Lv {enemy.level}</span>
        </span>
      </div>
      <div class="hp-row">
        <span class="hp num">{dead ? 0 : enemy.hp}</span>
        <span class="hp-max num">/ {enemy.maxHp}</span>
        {#if !dead && enemy.enraged}<span class="enrage-tag">Enraged</span>{/if}
        {#if !dead && enemy.dot}
          <span class="dot-chip" class:push={!enemy.enraged}>
            <span class="dot-icon"><AbilityIcon id="ignite" /></span>
            <span class="num">{ticksToSeconds(enemy.dot.remainingTicks)}s</span>
          </span>
        {/if}
      </div>
      <Bar value={dead ? 0 : enemy.hp} max={enemy.maxHp} kind="life" label="{enemy.name} health" />

      <!-- swing / hardcast row: space always reserved -->
      <div class="threat" class:idle={dead}>
        {#if casting && enemy.cast}
          <div class="threat-head">
            <span class="threat-label casting">casting {enemy.cast.name} — interrupt!</span>
            <span class="threat-time num">{ticksToSeconds(enemy.cast.remainingTicks)}s</span>
          </div>
          <Bar value={enemy.cast.progress} max={1} kind="enemycast" height={7} label="{enemy.name} casting {enemy.cast.name}" />
        {:else}
          <div class="threat-head">
            <span class="threat-label">next swing</span>
          </div>
          <Bar value={dead ? 0 : enemy.swingProgress} max={1} kind="swing" height={7} label="{enemy.name} swing windup" />
        {/if}
      </div>
    </div>
  </div>

  {#if !enemy.alive}
    <div class="slain-word" aria-hidden="true">Slain</div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    padding: 16px 20px 12px;
    min-height: 150px;
    flex: 1;
    min-width: 0;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    text-align: left;
    transition:
      filter 400ms ease,
      transform 400ms ease,
      opacity 400ms ease,
      box-shadow 400ms ease;
  }

  .card.compact {
    padding: 12px 16px 10px;
    min-height: 132px;
  }

  .card.dead {
    cursor: default;
  }

  /* The back-row mob stands a step behind the line. */
  .card.back:not(.dead) {
    transform: translateY(-6px) scale(0.98);
  }

  /* The reticle: the one card your spells answer to. */
  .card.targeted {
    box-shadow:
      0 0 0 1.5px oklch(0.8 0.11 195 / 0.75),
      0 0 26px -4px oklch(0.8 0.11 195 / 0.55),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .reticle {
    position: absolute;
    top: -9px;
    left: 50%;
    translate: -50% 0;
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 9px solid oklch(0.8 0.11 195 / 0.95);
    filter: drop-shadow(0 0 6px oklch(0.8 0.11 195 / 0.8));
    animation: reticle-drop 240ms var(--ease-spring);
  }

  @keyframes reticle-drop {
    from {
      translate: -50% -7px;
      opacity: 0;
    }
  }

  .card.enraged {
    box-shadow:
      0 0 0 1px oklch(0.68 0.17 25 / 0.4),
      0 0 28px -6px oklch(0.68 0.17 25 / 0.5),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .card.enraged.targeted {
    box-shadow:
      0 0 0 1.5px oklch(0.8 0.11 195 / 0.75),
      0 0 28px -6px oklch(0.68 0.17 25 / 0.5),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .card.boss:not(.dead) {
    box-shadow:
      0 0 0 1px oklch(0.8 0.13 80 / 0.28),
      0 0 30px -8px oklch(0.8 0.13 80 / 0.35),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .card.boss.targeted {
    box-shadow:
      0 0 0 1.5px oklch(0.8 0.11 195 / 0.75),
      0 0 30px -8px oklch(0.8 0.13 80 / 0.35),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .body {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .portrait {
    position: relative;
    width: 76px;
    height: 76px;
    flex: none;
    border-radius: 50%;
    padding: 9px;
    background: radial-gradient(circle, oklch(0.8 0.02 260 / 0.07) 0%, transparent 72%);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    transition: box-shadow var(--dur) ease;
  }

  .card.compact .portrait {
    width: 58px;
    height: 58px;
    padding: 7px;
  }

  /* A hardcast is a threat with a timer on it. Say so, loudly. */
  .card.casting .portrait {
    border-color: oklch(0.78 0.14 65 / 0.6);
    box-shadow:
      0 0 22px -2px oklch(0.75 0.17 55 / 0.6),
      inset 0 0 20px -4px oklch(0.75 0.17 55 / 0.5);
    animation: cast-warn 620ms ease-in-out infinite alternate;
  }

  @keyframes cast-warn {
    to {
      box-shadow:
        0 0 34px 2px oklch(0.75 0.17 55 / 0.85),
        inset 0 0 26px -2px oklch(0.75 0.17 55 / 0.7);
    }
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .name {
    font-size: 17px;
    font-weight: 580;
    color: oklch(0.88 0.04 25);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card.compact .name {
    font-size: 14.5px;
  }

  .tags {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }

  .rank {
    font-size: 10px;
    font-weight: 680;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border-radius: 99px;
    padding: 1px 8px;
  }

  .rank.elite {
    color: var(--arcana);
    border: 1px solid oklch(0.72 0.15 300 / 0.4);
  }

  .rank.bossy {
    color: var(--ember);
    border: 1px solid oklch(0.8 0.13 80 / 0.45);
    box-shadow: 0 0 12px oklch(0.8 0.13 80 / 0.25);
  }

  .rank.backrow {
    color: var(--text-dim);
    border: 1px solid oklch(0.85 0.03 260 / 0.25);
  }

  .level {
    font-size: 11px;
    font-weight: 620;
    color: var(--text-dim);
  }

  .card.compact .level {
    display: none;
  }

  .hp-row {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .hp {
    font-size: 15px;
    font-weight: 640;
    color: var(--life);
  }

  .hp-max {
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .enrage-tag {
    margin-left: auto;
    font-size: 10.5px;
    font-weight: 680;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--wound);
    animation: enrage-throb 900ms ease-in-out infinite alternate;
  }

  @keyframes enrage-throb {
    from {
      opacity: 0.65;
    }
    to {
      opacity: 1;
    }
  }

  .threat {
    margin-top: 5px;
    display: grid;
    gap: 3px;
    transition: opacity var(--dur) ease;
  }

  .threat.idle {
    opacity: 0.35;
  }

  .threat-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    min-height: 16px;
  }

  .threat-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .threat-label.casting {
    color: oklch(0.78 0.14 65);
    font-weight: 660;
  }

  .threat-time {
    font-size: 11px;
    color: oklch(0.78 0.14 65);
  }

  .dot-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px 2px 6px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    color: var(--arcana);
    background: oklch(0.72 0.15 300 / 0.1);
    border: 1px solid oklch(0.72 0.15 300 / 0.3);
    box-shadow: 0 0 14px oklch(0.72 0.15 300 / 0.18);
  }

  .dot-chip.push {
    margin-left: auto;
  }

  .dot-icon {
    width: 14px;
    height: 14px;
  }

  .dead {
    filter: saturate(0.12) brightness(0.66);
    transform: scale(0.97) translateY(3px);
  }

  /* One fallen packmate: mark it, but don't shroud the fight around it. */
  .slain-word {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    background: oklch(0.1 0.025 280 / 0.55);
    backdrop-filter: blur(1.5px);
    animation: slain-in 320ms ease-out;
  }

  @keyframes slain-in {
    from {
      opacity: 0;
    }
  }

  /* Taking a spell knocks the body back toward the dark it came from. */
  .card {
    --power: 1;
    --knock: calc(9px * var(--power));
  }

  :global(.card.enemy.hit) {
    animation: recoil-up 300ms var(--ease-punch);
  }

  /* A crit doesn't knock it back — it *hurls* it, and the body flashes white
     to the bone before it settles. */
  :global(.card.enemy.crit-hit) {
    animation: crit-up 560ms var(--ease-punch);
  }

  @keyframes recoil-up {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1.9);
    }
    16% {
      transform: translate3d(2px, calc(var(--knock) * -1), 0) scale(1.02);
      filter: brightness(1.5);
    }
    44% {
      transform: translate3d(-1px, 4px, 0) scale(0.992);
      filter: brightness(1.05);
    }
    72% {
      transform: translate3d(1px, -1px, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1);
    }
  }

  @keyframes crit-up {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(3.4) saturate(0.2) contrast(1.3);
      box-shadow: 0 0 0 3px oklch(0.98 0.06 90), 0 0 70px 6px oklch(0.85 0.16 70 / 0.95);
    }
    10% {
      transform: translate3d(4px, calc(var(--knock) * -2.2), 0) scale(1.05) rotate(1.4deg);
      filter: brightness(2.1) saturate(0.6);
    }
    30% {
      transform: translate3d(-2px, calc(var(--knock) * 0.65), 0) scale(0.975) rotate(-0.7deg);
      filter: brightness(1.25);
      box-shadow: 0 0 0 2px oklch(0.85 0.14 70 / 0.5), 0 0 40px -2px oklch(0.8 0.15 60 / 0.6);
    }
    52% {
      transform: translate3d(1px, calc(var(--knock) * -0.4), 0) scale(1.008) rotate(0.3deg);
    }
    76% {
      transform: translate3d(-1px, 0, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  /* Arriving out of the dark, as the motes converge. */
  :global(.card.enemy.reborn) {
    animation: enemy-arrive 520ms var(--ease-out-expo);
  }

  @keyframes enemy-arrive {
    0% {
      opacity: 0;
      transform: scale(1.06);
      filter: brightness(2.4) saturate(0.3);
    }
    100% {
      opacity: 1;
      transform: scale(1);
      filter: brightness(1) saturate(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .enrage-tag,
    .card.casting .portrait,
    .reticle,
    :global(.card.enemy.hit),
    :global(.card.enemy.crit-hit),
    :global(.card.enemy.reborn) {
      animation: none;
    }
  }
</style>
