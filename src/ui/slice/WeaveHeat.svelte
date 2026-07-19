<script lang="ts">
  /** The Arcanist's Heat gauge: ten rungs of accumulated fire that evolve the
   *  Fireball as they climb — plus the universal Focus readiness. Lives beside
   *  the wheel. */
  let { heat, focusReady, focusCd }: { heat: number; focusReady: boolean; focusCd: number } = $props()

  const band = $derived(heat >= 10 ? 'overheat' : heat >= 5 ? 'empowered' : 'cold')
  const state = $derived(heat >= 10 ? 'Overheat' : heat >= 5 ? 'Empowered' : 'Building Heat')
  const hint = $derived(
    heat >= 10 ? 'Fireball pierces the line + burning ground' : heat >= 5 ? 'Fireball splashes the pack' : 'stoke fire to empower Fireball',
  )
</script>

<div class="fire" class:overheat={band === 'overheat'} class:empowered={band === 'empowered'}>
  <div class="gauge" aria-label="Heat {heat} of 10">
    {#each Array(10) as _, i (i)}
      <span class="pip" class:lit={i < heat} class:hot={i >= 4} class:crown={i >= 9}></span>
    {/each}
  </div>
  <div class="labels">
    {#key state}
      <span class="state">{state}</span>
    {/key}
    <span class="hint">{hint}</span>
    <span class="focus" class:ready={focusReady}>
      <span class="dot"></span>
      {#if focusReady}
        Focus ready — <kbd>Space</kbd>
      {:else}
        Focus {(focusCd / 20).toFixed(1)}s
      {/if}
    </span>
  </div>
</div>

<style>
  .fire {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
  }
  .gauge {
    display: grid;
    grid-template-rows: repeat(5, 1fr);
    grid-auto-flow: column;
    gap: 3px;
  }
  .pip {
    width: 12px;
    height: 6px;
    border-radius: 2px;
    border: 1px solid oklch(0.72 0.19 45 / 0.28);
    background: oklch(0.3 0.05 40 / 0.4);
    transition:
      background var(--dur) var(--ease-out-expo),
      box-shadow var(--dur) var(--ease-out-expo);
  }
  .pip.lit {
    background: linear-gradient(180deg, var(--ember-glow, oklch(0.82 0.15 60)), var(--ember-war, oklch(0.6 0.2 35)));
    border-color: var(--ember-glow, oklch(0.82 0.15 60));
    box-shadow: 0 0 8px oklch(0.72 0.19 45 / 0.55);
  }
  .pip.lit.hot {
    box-shadow: 0 0 11px oklch(0.75 0.21 42 / 0.75);
  }
  .pip.lit.crown {
    background: linear-gradient(180deg, oklch(0.95 0.08 95), oklch(0.7 0.22 32));
  }
  .labels {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .state {
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.1;
  }
  .empowered .state {
    color: var(--ember-glow, oklch(0.82 0.15 60));
  }
  .overheat .state {
    color: var(--ember, oklch(0.72 0.19 45));
    text-shadow: 0 0 16px oklch(0.72 0.19 45 / 0.7);
    animation: hot-pop var(--dur) var(--ease-spring);
  }
  .hint {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--signal-dim);
  }
  .overheat .hint,
  .empowered .hint {
    color: var(--ember-glow, oklch(0.82 0.15 60));
  }
  .focus {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--signal-dim);
    margin-top: 2px;
  }
  .focus .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: oklch(0.4 0.03 200 / 0.6);
  }
  .focus.ready {
    color: oklch(0.82 0.11 195);
  }
  .focus.ready .dot {
    background: oklch(0.82 0.11 195);
    box-shadow: 0 0 8px oklch(0.82 0.11 195 / 0.8);
    animation: focus-pulse 1.2s ease-in-out infinite;
  }
  .focus kbd {
    font-family: var(--font-mono);
    font-size: 8.5px;
    padding: 0 5px;
    border-radius: 4px;
    border: 1px solid oklch(0.82 0.11 195 / 0.4);
    background: oklch(0.82 0.11 195 / 0.08);
  }
  @keyframes hot-pop {
    from {
      transform: scale(0.8);
      filter: brightness(2);
    }
  }
  @keyframes focus-pulse {
    50% {
      opacity: 0.4;
    }
  }
  .overheat .pip.lit.crown {
    animation: ember-flare 800ms ease-in-out infinite alternate;
  }
  @keyframes ember-flare {
    to {
      box-shadow: 0 0 16px oklch(0.8 0.22 45 / 0.95);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .state,
    .focus.ready .dot,
    .overheat .pip.lit.crown {
      animation: none;
    }
  }
</style>
