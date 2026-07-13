<script lang="ts">
  import { ACHIEVEMENTS } from '../../engine'
  import type { Game } from '../game.svelte'

  let { game }: { game: Game } = $props()

  let confirmReset = $state(false)

  const life = $derived(game.progress.lifetime)
  const tiles = $derived([
    { label: 'Creatures slain', value: life.kills },
    { label: 'Bosses felled', value: life.bossKills },
    { label: 'Deaths', value: life.deaths },
    { label: 'Gold earned', value: life.goldEarned },
    { label: 'Spells interrupted', value: life.interrupts },
    { label: 'Epics found', value: life.epicsFound },
  ])
  const unlocked = $derived(new Set(game.progress.achievements))
</script>

<div class="stack">
  <section class="glass pane" aria-label="Lifetime statistics">
    <h2>Chronicle</h2>
    <div class="stat-grid">
      {#each tiles as tile (tile.label)}
        <div class="stat-tile">
          <span class="stat-value num">{tile.value}</span>
          <span class="stat-label">{tile.label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="glass pane" aria-label="Achievements">
    <h2>
      Deeds
      <span class="count num">{unlocked.size} / {ACHIEVEMENTS.length}</span>
    </h2>
    <div class="deeds">
      {#each ACHIEVEMENTS as deed (deed.id)}
        <div class="deed" class:done={unlocked.has(deed.id)}>
          <span class="deed-mark">{unlocked.has(deed.id) ? '✦' : '·'}</span>
          <div class="deed-text">
            <span class="deed-name">{deed.name}</span>
            <span class="deed-desc">{deed.description}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="glass pane danger" aria-label="Dangerous things">
    <div class="danger-row">
      <div>
        <h3>Abandon this fate</h3>
        <p class="warn-text">Erase the save and begin again at level 1. There is no undo.</p>
      </div>
      {#if confirmReset}
        <div class="confirm">
          <button class="btn wound" onclick={() => game.resetSave()}>Yes, erase everything</button>
          <button class="btn" onclick={() => (confirmReset = false)}>Keep playing</button>
        </div>
      {:else}
        <button class="btn wound" onclick={() => (confirmReset = true)}>Reset save</button>
      {/if}
    </div>
  </section>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .pane {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h2 {
    font-size: 19px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .count {
    font-size: 12.5px;
    color: var(--text-dim);
    font-family: var(--font-ui);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }

  .stat-tile {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 640;
    color: var(--ember);
  }

  .stat-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .deeds {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
  }

  .deed {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.08);
    opacity: 0.45;
    transition: opacity var(--dur) ease, border-color var(--dur) ease;
  }

  .deed.done {
    opacity: 1;
    border-color: oklch(0.8 0.13 80 / 0.3);
    background: oklch(0.8 0.13 80 / 0.04);
  }

  .deed-mark {
    color: var(--ember);
    font-size: 14px;
    line-height: 1.4;
  }

  .deed-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .deed-name {
    font-size: 13px;
    font-weight: 620;
  }

  .deed-desc {
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .danger {
    border: 1px solid oklch(0.68 0.17 25 / 0.2);
  }

  .danger-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  h3 {
    font-size: 15px;
  }

  .warn-text {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--text-dim);
  }

  .confirm {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 7px 16px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 640;
    cursor: pointer;
    color: var(--text);
    border: 1px solid oklch(0.85 0.03 260 / 0.2);
    background: oklch(0.8 0.02 260 / 0.06);
    transition: box-shadow var(--dur-fast) ease;
  }

  .btn.wound {
    color: var(--wound);
    border-color: oklch(0.68 0.17 25 / 0.45);
    background: oklch(0.68 0.17 25 / 0.07);
  }

  .btn.wound:hover {
    box-shadow: 0 0 16px -4px oklch(0.68 0.17 25 / 0.5);
  }
</style>
