<script lang="ts">
  import type { Game } from '../game.svelte'
  import Bar from '../components/Bar.svelte'

  let { game }: { game: Game } = $props()

  const assaulting = $derived(game.combat.phase === 'assault')
  const wb = $derived(game.progress.worldBoss)

  const TIER_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', hard: 'Hard' }
</script>

<section class="atlas" aria-label="Regions">
  {#each game.progress.regions as region (region.id)}
    <article class="glass zone" class:current={region.current} style:--zh={region.hue}>
      <header class="zone-head">
        <div>
          <h2>{region.name}</h2>
          <p class="epithet">{region.epithet}</p>
        </div>
        <span class="reco num" data-tier={region.tier}>{TIER_LABEL[region.tier]}</span>
      </header>

      <p class="band num">Recommended Lv {region.minLevel}–{region.maxLevel}</p>

      <p class="roster">
        {region.enemyNames.join(' · ')}
      </p>

      <div class="zone-foot">
        {#if region.current}
          <span class="here">You are here</span>
        {:else}
          <button
            class="btn"
            disabled={assaulting}
            title={assaulting ? 'Break off the assault first' : ''}
            onclick={() => game.enterRegion(region.id)}
          >
            Venture in
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
      disabled={assaulting}
      title={assaulting ? 'Already assaulting' : ''}
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
    font-size: 10px;
    font-weight: 660;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    border: 1px solid oklch(0.68 0.02 260 / 0.3);
    border-radius: 99px;
    padding: 2px 9px;
  }

  .reco[data-tier='low'] {
    color: oklch(0.8 0.11 150);
    border-color: oklch(0.72 0.12 150 / 0.45);
  }
  .reco[data-tier='medium'] {
    color: oklch(0.82 0.13 60);
    border-color: oklch(0.75 0.14 60 / 0.45);
  }
  .reco[data-tier='hard'] {
    color: oklch(0.78 0.15 305);
    border-color: oklch(0.7 0.16 305 / 0.45);
  }

  .band {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
  }

  .roster {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    flex: 1;
  }

  .zone-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    min-height: 32px;
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
