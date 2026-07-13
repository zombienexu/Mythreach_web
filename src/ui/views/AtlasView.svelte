<script lang="ts">
  import { BOSS_KILLS_REQUIRED } from '../../engine'
  import type { Game } from '../game.svelte'

  let { game }: { game: Game } = $props()
</script>

<section class="atlas" aria-label="Zone atlas">
  {#each game.progress.zones as zone, i (zone.id)}
    <article class="glass zone" class:locked={!zone.unlocked} class:current={zone.current} style:--zh={zone.hue}>
      <header class="zone-head">
        <div>
          <h2>{zone.name}</h2>
          <p class="epithet">{zone.epithet}</p>
        </div>
        <span class="reco num">Lv {zone.minLevel}+</span>
      </header>

      <p class="roster">
        {zone.enemyNames.join(' · ')}
      </p>

      <div class="boss-row">
        <span class="boss-name" class:dead={zone.bossDefeated}>
          {zone.bossDefeated ? '✦' : '☠'} {zone.bossName}
        </span>
        {#if zone.unlocked && !zone.bossDefeated}
          <span class="progress num">{Math.min(zone.kills, BOSS_KILLS_REQUIRED)}/{BOSS_KILLS_REQUIRED}</span>
        {/if}
      </div>

      <div class="zone-foot">
        {#if !zone.unlocked}
          <span class="lock-note">
            {i > 0 ? `Defeat ${game.progress.zones[i - 1]?.bossName ?? 'the previous boss'} to enter` : 'Locked'}
          </span>
        {:else if zone.current}
          <span class="here">You are here</span>
          <button
            class="btn gold-btn"
            disabled={!zone.bossReady || !game.combat.player.alive}
            onclick={() => game.challengeBoss()}
          >
            {zone.bossDefeated ? 'Challenge again' : 'Challenge boss'}
          </button>
        {:else}
          <button class="btn" onclick={() => game.travel(zone.id)}>Travel</button>
        {/if}
      </div>
    </article>
  {/each}
</section>

<style>
  .atlas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-content: start;
  }

  .zone {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 2px solid oklch(0.72 0.13 calc(var(--zh) * 1) / 0.55);
    transition: filter var(--dur) ease, box-shadow var(--dur) ease;
  }

  .zone.locked {
    filter: saturate(0.25) brightness(0.75);
  }

  .zone.current {
    box-shadow:
      0 0 0 1px oklch(0.72 0.13 calc(var(--zh) * 1) / 0.4),
      0 0 26px -8px oklch(0.72 0.13 calc(var(--zh) * 1) / 0.5),
      0 18px 40px -18px oklch(0.05 0.02 280 / 0.9);
  }

  .zone-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  h2 {
    font-size: 18px;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
  }

  .epithet {
    margin: 1px 0 0;
    font-size: 11.5px;
    font-style: italic;
    color: var(--text-dim);
  }

  .reco {
    flex: none;
    font-size: 11px;
    font-weight: 640;
    color: var(--text-dim);
    border: 1px solid oklch(0.68 0.02 260 / 0.3);
    border-radius: 99px;
    padding: 2px 9px;
  }

  .roster {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    flex: 1;
  }

  .boss-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .boss-name {
    font-size: 13px;
    font-weight: 620;
    color: var(--ember);
  }

  .boss-name.dead {
    color: var(--text-dim);
    text-decoration: line-through;
    text-decoration-color: oklch(0.68 0.02 260 / 0.5);
  }

  .progress {
    font-size: 12px;
    color: var(--text-dim);
  }

  .zone-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    min-height: 32px;
  }

  .lock-note {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
  }

  .here {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
    font-weight: 640;
  }

  .btn {
    margin-left: auto;
    padding: 6px 16px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 640;
    cursor: pointer;
    color: var(--ether);
    border: 1px solid oklch(0.8 0.11 195 / 0.4);
    background: oklch(0.8 0.11 195 / 0.07);
    transition: box-shadow var(--dur-fast) ease, opacity var(--dur-fast) ease;
  }

  .btn:hover:not(:disabled) {
    box-shadow: 0 0 16px -4px oklch(0.8 0.11 195 / 0.5);
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .gold-btn {
    color: var(--ember);
    border-color: oklch(0.8 0.13 80 / 0.45);
    background: oklch(0.8 0.13 80 / 0.08);
  }

  .gold-btn:hover:not(:disabled) {
    box-shadow: 0 0 16px -4px oklch(0.8 0.13 80 / 0.5);
  }
</style>
