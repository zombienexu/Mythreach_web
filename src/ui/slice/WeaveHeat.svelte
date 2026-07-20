<script lang="ts">
  /** The Arcanist's Heat gauge: ten rungs of accumulated fire that evolve the
   *  Fireball as they climb. A full-width bar that sits directly above the
   *  abilities. The heat it carries washes the whole page in a deepening orange
   *  glow (driven from the arena, not here). */
  let { heat }: { heat: number; focusReady?: boolean; focusCd?: number } = $props()

  const heatf = $derived(Math.max(0, Math.min(1, heat / 10)))
  const band = $derived(heat >= 10 ? 'overheat' : heat >= 5 ? 'empowered' : 'cold')
  const state = $derived(heat >= 10 ? 'Overheat' : heat >= 5 ? 'Empowered' : 'Building Heat')
  const hint = $derived(
    heat >= 10 ? 'Fireball pierces the whole line + burning ground' : heat >= 5 ? 'Fireball splashes the pack' : 'stoke fire to empower Fireball',
  )
</script>

<div class="fire {band}" style:--heatf={heatf}>
  <div class="head">
    <span class="title">Heat</span>
    {#key state}<span class="state">{state}</span>{/key}
    <span class="hint">{hint}</span>
    <span class="count num">{heat}<span class="cap">/10</span></span>
  </div>

  <div class="gauge" aria-label="Heat {heat} of 10">
    {#each Array(10) as _, i (i)}
      <span class="pip" class:lit={i < heat} class:hot={i >= 4} class:crown={i >= 9}></span>
    {/each}
  </div>
</div>

<style>
  .fire {
    --heatf: 0;
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px 12px 8px;
    border-radius: 12px;
    border: 1px solid oklch(0.72 0.19 45 / calc(0.14 + var(--heatf) * 0.3));
    background:
      radial-gradient(120% 140% at 50% 130%, oklch(0.72 0.19 45 / calc(var(--heatf) * 0.16)), transparent 72%),
      linear-gradient(180deg, oklch(0.16 0.03 40 / 0.45), oklch(0.1 0.03 40 / 0.58));
    transition:
      border-color var(--dur) ease,
      box-shadow var(--dur) ease;
  }
  .overheat {
    box-shadow: 0 0 30px -12px oklch(0.75 0.21 42 / 0.85);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 9px;
  }
  .title {
    font-size: 10px;
    font-weight: 680;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: oklch(0.78 0.16 60);
  }
  .state {
    font-family: var(--font-display);
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1;
  }
  .empowered .state {
    color: var(--ember-glow, oklch(0.82 0.15 60));
  }
  .overheat .state {
    color: var(--ember-war, oklch(0.72 0.19 45));
    text-shadow: 0 0 16px oklch(0.72 0.19 45 / 0.7);
    animation: hot-pop var(--dur) var(--ease-spring);
  }
  .hint {
    font-family: var(--font-mono, monospace);
    font-size: 8.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--signal-dim, var(--text-dim));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .overheat .hint,
  .empowered .hint {
    color: var(--ember-glow, oklch(0.82 0.15 60));
  }
  .count {
    margin-left: auto;
    font-size: 13px;
    font-weight: 680;
    color: oklch(calc(0.78 + var(--heatf) * 0.12) 0.15 62);
  }
  .cap {
    font-weight: 500;
    opacity: 0.55;
    font-size: 10px;
  }

  .gauge {
    display: flex;
    gap: 3px;
  }
  .pip {
    flex: 1;
    height: 11px;
    border-radius: 3px;
    border: 1px solid oklch(0.72 0.19 45 / 0.28);
    background: oklch(0.28 0.05 40 / 0.5);
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
    box-shadow: 0 0 12px oklch(0.75 0.21 42 / 0.8);
  }
  .pip.lit.crown {
    background: linear-gradient(180deg, oklch(0.95 0.08 95), oklch(0.7 0.22 32));
  }
  .overheat .pip.lit.crown {
    animation: ember-flare 800ms ease-in-out infinite alternate;
  }

  @keyframes hot-pop {
    from {
      transform: scale(0.8);
      filter: brightness(2);
    }
  }
  @keyframes ember-flare {
    to {
      box-shadow: 0 0 16px oklch(0.8 0.22 45 / 0.95);
    }
  }
</style>
