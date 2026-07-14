<script lang="ts">
  import type { EnemySnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import Bar from './Bar.svelte'
  import AbilityIcon from './icons/AbilityIcon.svelte'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'

  let {
    enemy,
    lastEnemy = null,
    spawnIn = 0,
    spawnKind = 'normal',
    bossName = '',
    impact = 0,
  }: {
    enemy: EnemySnapshot | null
    lastEnemy?: EnemySnapshot | null
    spawnIn?: number
    spawnKind?: 'normal' | 'boss'
    bossName?: string
    impact?: number
  } = $props()

  // Render the living enemy, or the corpse of the last one while we wait.
  const shown = $derived(enemy ?? lastEnemy)
  const slain = $derived(enemy === null && lastEnemy !== null)
  const empty = $derived(enemy === null && lastEnemy === null)

  let el: HTMLElement | undefined = $state()

  function pulse(cls: string) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  $effect(() => {
    if (impact > 0) pulse('hit')
  })

  // New spawn: fade-up from the void.
  let lastDefId: string | null = null
  $effect(() => {
    const id = enemy?.defId ?? null
    if (id !== null && lastDefId === null) pulse('reborn')
    lastDefId = id
  })
</script>

<article
  class="glass card enemy"
  class:dead={slain}
  class:enraged={enemy?.enraged ?? false}
  class:boss={(shown?.rank ?? (spawnKind === 'boss' ? 'boss' : 'normal')) === 'boss'}
  class:casting={enemy?.cast != null}
  data-fx-card="enemy"
  bind:this={el}
>
  {#if shown}
    <div class="body">
      <div class="portrait" data-fx-anchor="enemy">
        <EnemyPortrait
          family={shown.portrait.family}
          hue={shown.portrait.hue}
          name={shown.name}
          enraged={enemy?.enraged ?? false}
        />
      </div>

      <div class="info">
        <div class="name-row">
          <h3 class="name">{shown.name}</h3>
          <span class="tags">
            {#if shown.rank === 'elite'}<span class="rank elite">Elite</span>{/if}
            {#if shown.rank === 'boss'}<span class="rank bossy">Boss</span>{/if}
            <span class="level num">Lv {shown.level}</span>
          </span>
        </div>
        <div class="hp-row">
          <span class="hp num">{slain ? 0 : shown.hp}</span>
          <span class="hp-max num">/ {shown.maxHp}</span>
          {#if enemy?.enraged}<span class="enrage-tag">Enraged</span>{/if}
          {#if enemy?.dot}
            <span class="dot-chip" class:push={!enemy.enraged}>
              <span class="dot-icon"><AbilityIcon id="ignite" /></span>
              <span class="num">{ticksToSeconds(enemy.dot.remainingTicks)}s</span>
            </span>
          {/if}
        </div>
        <Bar value={slain ? 0 : shown.hp} max={shown.maxHp} kind="life" label="{shown.name} health" />

        <!-- swing / hardcast row: space always reserved -->
        <div class="threat" class:idle={slain}>
          {#if enemy?.cast}
            <div class="threat-head">
              <span class="threat-label casting">casting {enemy.cast.name} — interrupt!</span>
              <span class="threat-time num">{ticksToSeconds(enemy.cast.remainingTicks)}s</span>
            </div>
            <Bar value={enemy.cast.progress} max={1} kind="enemycast" height={7} label="{shown.name} casting {enemy.cast.name}" />
          {:else}
            <div class="threat-head">
              <span class="threat-label">next swing</span>
            </div>
            <Bar value={enemy?.swingProgress ?? 0} max={1} kind="swing" height={7} label="{shown.name} swing windup" />
          {/if}
        </div>
      </div>
    </div>

    {#if slain}
      <div class="veil">
        <span class="veil-word">Slain</span>
        <span class="veil-count num">
          {spawnKind === 'boss' ? `${bossName} approaches…` : `next foe in ${ticksToSeconds(spawnIn)}s`}
        </span>
      </div>
    {/if}
  {:else if empty}
    <div class="empty">
      <span class="veil-word">{spawnKind === 'boss' ? `${bossName} approaches…` : 'The dark stirs…'}</span>
      <span class="veil-count num">{ticksToSeconds(spawnIn)}s</span>
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
      opacity 400ms ease,
      box-shadow 400ms ease;
  }

  .card.enraged {
    box-shadow:
      0 0 0 1px oklch(0.68 0.17 25 / 0.4),
      0 0 28px -6px oklch(0.68 0.17 25 / 0.5),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .card.boss:not(.dead) {
    box-shadow:
      0 0 0 1px oklch(0.8 0.13 80 / 0.28),
      0 0 30px -8px oklch(0.8 0.13 80 / 0.35),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
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
    transition: box-shadow var(--dur) ease;
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
    gap: 6px;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .name {
    font-size: 19px;
    font-weight: 580;
    color: oklch(0.88 0.04 25);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .level {
    font-size: 11.5px;
    font-weight: 620;
    color: var(--text-dim);
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
    margin-top: 6px;
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
    font-size: 11.5px;
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

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    opacity: 0.85;
  }

  .veil-word {
    font-family: var(--font-display);
    font-size: 19px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .veil-count {
    font-size: 14px;
    font-weight: 620;
    color: var(--text);
  }

  /* Taking a spell knocks the body away from the caster and it springs back. */
  :global(.card.enemy.hit) {
    animation: recoil-right 300ms var(--ease-punch);
  }

  @keyframes recoil-right {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1.9);
    }
    16% {
      transform: translate3d(11px, -3px, 0) scale(1.02);
      filter: brightness(1.5);
    }
    44% {
      transform: translate3d(-5px, 1px, 0) scale(0.992);
      filter: brightness(1.05);
    }
    72% {
      transform: translate3d(2px, 0, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1);
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
    :global(.card.enemy.hit),
    :global(.card.enemy.reborn) {
      animation: none;
    }
  }
</style>
