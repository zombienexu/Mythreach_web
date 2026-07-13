<script lang="ts">
  import type { OfflineSummary } from '../../engine'
  import { ticksToDuration } from '../format'
  import ItemTile from './ItemTile.svelte'
  import Modal from './Modal.svelte'

  let {
    summary,
    onclose,
  }: {
    summary: OfflineSummary
    onclose?: () => void
  } = $props()

  const shownItems = $derived(summary.itemsKept.slice(0, 6))
</script>

<Modal label="While you were away" {onclose}>
  <header class="head">
    <span class="eyebrow">while you were away</span>
    <h2>Your echo kept fighting</h2>
    <p class="sub">{ticksToDuration(summary.ticks)} of battle in your absence.</p>
  </header>

  <div class="haul">
    <div class="haul-tile">
      <span class="haul-num num">{summary.kills}</span>
      <span class="haul-label">kills</span>
    </div>
    <div class="haul-tile">
      <span class="haul-num num">+{summary.xpGained}</span>
      <span class="haul-label">xp</span>
    </div>
    <div class="haul-tile gold">
      <span class="haul-num num">+{summary.goldGained}</span>
      <span class="haul-label">gold</span>
    </div>
    <div class="haul-tile">
      <span class="haul-num num">{summary.deaths}</span>
      <span class="haul-label">deaths</span>
    </div>
  </div>

  {#if summary.levelTo > summary.levelFrom}
    <p class="levels">
      Level <span class="num">{summary.levelFrom}</span> → <span class="lvl-to num">{summary.levelTo}</span>
    </p>
  {/if}

  {#if shownItems.length > 0}
    <h3>Loot worth keeping</h3>
    <div class="items">
      {#each shownItems as item (item.uid)}
        <ItemTile {item} />
      {/each}
    </div>
  {/if}
  {#if summary.itemsSold > 0}
    <p class="sold">…and {summary.itemsSold} more piece{summary.itemsSold === 1 ? '' : 's'} sold with full bags.</p>
  {/if}

  <button class="cta" onclick={() => onclose?.()}>Take back the fight</button>
</Modal>

<style>
  .head {
    text-align: center;
    margin-bottom: 18px;
  }

  .eyebrow {
    font-size: 10.5px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  h2 {
    font-size: 24px;
    margin-top: 4px;
    background: linear-gradient(115deg, var(--text) 40%, var(--ether) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-dim);
  }

  .haul {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .haul-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 12px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.12);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  .haul-num {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 640;
  }

  .haul-tile.gold .haul-num {
    color: var(--ember);
  }

  .haul-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .levels {
    text-align: center;
    margin: 14px 0 0;
    font-size: 15px;
  }

  .lvl-to {
    color: var(--xp);
    font-weight: 680;
    font-size: 19px;
  }

  h3 {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-weight: 600;
    margin: 18px 0 8px;
  }

  .items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .sold {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
  }

  .cta {
    margin-top: 22px;
    width: 100%;
    padding: 12px;
    border-radius: var(--radius);
    font-size: 15px;
    font-weight: 640;
    letter-spacing: 0.02em;
    cursor: pointer;
    color: var(--void-deep);
    border: 0;
    background: linear-gradient(115deg, var(--ether), oklch(0.72 0.13 240));
    box-shadow: 0 0 26px -6px oklch(0.8 0.11 195 / 0.6);
    transition: transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-fast) ease;
  }

  .cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 32px -6px oklch(0.8 0.11 195 / 0.75);
  }
</style>
