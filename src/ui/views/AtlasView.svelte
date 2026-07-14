<script lang="ts">
  import type { Game } from '../game.svelte'
  import Bar from '../components/Bar.svelte'

  let { game }: { game: Game } = $props()

  const onExpedition = $derived(game.combat.phase !== 'camp')
  const wb = $derived(game.progress.worldBoss)
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
      </div>

      <div class="zone-foot">
        {#if !zone.unlocked}
          <span class="lock-note">
            {i > 0 ? `Defeat ${game.progress.zones[i - 1]?.bossName ?? 'the previous boss'} to enter` : 'Locked'}
          </span>
        {:else if zone.current}
          <span class="here">You are here</span>
        {:else}
          <button
            class="btn"
            disabled={onExpedition}
            title={onExpedition ? 'Return to camp first' : ''}
            onclick={() => game.travel(zone.id)}
          >
            Travel
          </button>
        {/if}
      </div>
    </article>
  {/each}
</section>

<section class="glass colossus" aria-label="The Rift Colossus">
  <header class="col-head">
    <div>
      <h2>{wb.name}</h2>
      <p class="epithet">A wound in the sky that never fully closes.</p>
    </div>
    <span class="fells num" title="Times felled">{wb.fells} felled</span>
  </header>
  <Bar value={wb.hp} max={wb.maxHp} kind="swing" label="Rift Colossus health" height={12} />
  <div class="col-foot">
    <span class="col-hp num">{wb.hp.toLocaleString()} / {wb.maxHp.toLocaleString()}</span>
    <button
      class="seal"
      disabled={onExpedition}
      title={onExpedition ? 'Return to camp first' : ''}
      onclick={() => game.assault()}
    >
      Assault
    </button>
  </div>
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

  .zone-head,
  .col-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  h2 {
    font-size: 18px;
    color: oklch(0.85 0.09 calc(var(--zh, 305) * 1));
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

  .colossus {
    --zh: 305;
    margin-top: 20px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 2px solid oklch(0.72 0.16 305 / 0.55);
  }

  .fells {
    flex: none;
    font-size: 11px;
    font-weight: 640;
    color: var(--ember);
  }

  .col-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .col-hp {
    font-size: 12px;
    color: var(--text-dim);
  }
</style>
