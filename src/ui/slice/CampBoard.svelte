<script lang="ts">
  /** The Kindle Yard's sparring circle — the camp-era stand-in for the field
   *  board. One duel at a time: Sergeant Vale's brief, the opponent, and a
   *  single way forward. Replaced by the field board at graduation. */
  import { ENEMIES } from '../../engine'
  import EnemyPortrait from '../components/portraits/EnemyPortrait.svelte'
  import { CAMP_DUELS, PROVING_DUELS, type CampDuel } from './camp'
  import { SERGEANT } from './content'

  let {
    duel,
    stepsDone,
    onengage,
  }: {
    duel: CampDuel
    stepsDone: number
    onengage: () => void
  } = $props()

  const opponent = $derived(ENEMIES[duel.opponentId])
  const phase = $derived(stepsDone < PROVING_DUELS ? 'the proving' : 'the tempering')
</script>

<section class="camp" aria-label="The Kindle Yard — sparring circle">
  <header class="camp-head">
    <span class="readout">the kindle yard · {phase} — {SERGEANT} is watching</span>
    <div class="pips" aria-label="training progress {stepsDone} of {CAMP_DUELS.length}">
      {#each CAMP_DUELS as d, i (d.opponentId)}
        <span class="pip" class:done={i < stepsDone} class:next={i === stepsDone}></span>
      {/each}
    </div>
  </header>

  {#key stepsDone}
    <div class="circle console-panel ticked">
      <div class="bout">
        <span class="face">
          {#if opponent}
            <EnemyPortrait family={opponent.portrait.family} hue={opponent.portrait.hue} name={opponent.name} />
          {/if}
        </span>
        <div class="bill">
          <span class="bout-title readout">{duel.title}</span>
          <h3 class="opp-name">{opponent?.name ?? duel.opponentId}</h3>
          <p class="brief">{duel.brief}</p>
        </div>
      </div>

      <div class="lesson">
        <span class="lesson-mark" aria-hidden="true">◆</span>
        <span class="lesson-text">{duel.lesson}</span>
      </div>

      <button class="seal enter" onclick={onengage}>Step into the circle</button>
      <span class="hint">or press <kbd>Space</kbd></span>
    </div>
  {/key}
</section>

<style>
  .camp {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    max-width: 620px;
    align-items: stretch;
  }
  .camp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .pips {
    display: inline-flex;
    gap: 5px;
  }
  .pip {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1px solid oklch(0.72 0.19 45 / 0.4);
  }
  .pip.done {
    background: var(--ember-glow);
    box-shadow: 0 0 8px oklch(0.72 0.19 45 / 0.6);
  }
  .pip.next {
    border-color: var(--ember-glow);
    animation: pip-pulse 1.8s ease-in-out infinite;
  }
  @keyframes pip-pulse {
    50% {
      box-shadow: 0 0 8px oklch(0.72 0.19 45 / 0.6);
    }
  }

  .circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 22px 26px;
    animation: circle-in 480ms var(--ease-out-expo) both;
  }
  @keyframes circle-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  .bout {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
  }
  .face {
    width: 84px;
    height: 84px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
  }
  .bill {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }
  .bout-title {
    color: var(--ember-glow);
    opacity: 0.85;
  }
  .opp-name {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 570;
    color: var(--text);
  }
  .brief {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.65;
    font-style: italic;
    color: var(--text-dim);
  }

  .lesson {
    display: flex;
    align-items: baseline;
    gap: 9px;
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.72 0.19 45 / 0.25);
    background: oklch(0.72 0.19 45 / 0.06);
  }
  .lesson-mark {
    color: var(--ember-glow);
    font-size: 10px;
  }
  .lesson-text {
    font-size: 12px;
    letter-spacing: 0.02em;
    color: var(--text);
  }

  .enter {
    font-size: 14px;
    padding: 11px 28px;
  }
  .hint {
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .hint kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .circle,
    .pip.next {
      animation: none;
    }
  }
</style>
