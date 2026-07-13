<script lang="ts">
  import { INVENTORY_CAP, sellValue, type ItemSlot } from '../../engine'
  import type { Game } from '../game.svelte'
  import ItemTile from '../components/ItemTile.svelte'

  let { game }: { game: Game } = $props()

  const SLOTS: ItemSlot[] = ['staff', 'hood', 'robe', 'ring', 'trinket']
  const SLOT_LABEL: Record<ItemSlot, string> = {
    staff: 'Staff',
    hood: 'Hood',
    robe: 'Robe',
    ring: 'Ring',
    trinket: 'Trinket',
  }

  const stats = $derived(game.progress.stats)
  const tiles = $derived([
    { label: 'Power', value: `${stats.power}`, hint: '+1% spell damage each' },
    { label: 'Crit', value: `${stats.critPct}%`, hint: 'chance to strike for 175%' },
    { label: 'Stamina', value: `${stats.stamina}`, hint: '+5 max health each' },
    { label: 'Spirit', value: `${stats.spirit}`, hint: 'mana regen & healing' },
    { label: 'Max health', value: `${stats.maxHp}`, hint: '' },
    { label: 'Mana / regen', value: `${stats.maxMana} / +${stats.regenPerInterval}s`, hint: 'mana pool and per-second regen' },
  ])
</script>

<div class="columns">
  <section class="glass pane" aria-label="Statistics">
    <h2>The Arcanist</h2>
    <div class="stat-grid">
      {#each tiles as tile (tile.label)}
        <div class="stat-tile" title={tile.hint}>
          <span class="stat-value num">{tile.value}</span>
          <span class="stat-label">{tile.label}</span>
        </div>
      {/each}
    </div>

    <h3>Equipped</h3>
    <div class="equip-list">
      {#each SLOTS as slot (slot)}
        {@const worn = game.progress.equipped[slot]}
        <div class="equip-row">
          <span class="slot-label">{SLOT_LABEL[slot]}</span>
          {#if worn}
            <ItemTile item={worn} />
          {:else}
            <div class="empty-slot">— nothing —</div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <section class="glass pane" aria-label="Inventory">
    <h2>
      Bags
      <span class="cap num">{game.progress.inventory.length} / {INVENTORY_CAP}</span>
    </h2>
    {#if game.progress.inventory.length === 0}
      <p class="hint">Empty. The dark owes you loot — go collect.</p>
    {:else}
      <div class="inv-grid">
        {#each game.progress.inventory as item (item.uid)}
          <div class="inv-item">
            <ItemTile {item} compare={game.progress.equipped[item.slot] ?? null} />
            <div class="actions">
              <button class="act equip" onclick={() => game.equip(item)}>Equip</button>
              <button class="act sell" onclick={() => game.sell(item)}>Sell {sellValue(item)}g</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .columns {
    display: grid;
    grid-template-columns: minmax(300px, 5fr) minmax(320px, 7fr);
    gap: 20px;
    align-items: start;
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

  h3 {
    font-size: 13px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-weight: 600;
    margin-top: 4px;
  }

  .cap {
    font-size: 12px;
    color: var(--text-dim);
    font-family: var(--font-ui);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-tile {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  .stat-value {
    font-size: 17px;
    font-weight: 660;
    color: var(--ether);
  }

  .stat-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .equip-list {
    display: grid;
    gap: 8px;
  }

  .equip-row {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 10px;
    align-items: start;
  }

  .slot-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding-top: 12px;
  }

  .empty-slot {
    padding: 14px 12px;
    border-radius: var(--radius-sm);
    border: 1px dashed oklch(0.68 0.02 260 / 0.25);
    color: var(--text-dim);
    font-size: 12px;
    opacity: 0.7;
  }

  .hint {
    color: var(--text-dim);
    font-size: 13.5px;
    margin: 0;
  }

  .inv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
  }

  .inv-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .act {
    flex: 1;
    padding: 5px 0;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
    border: 1px solid oklch(0.85 0.03 260 / 0.15);
    background: oklch(0.8 0.02 260 / 0.05);
    color: var(--text);
    transition:
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  .act.equip:hover {
    border-color: oklch(0.8 0.11 195 / 0.5);
    box-shadow: 0 0 14px -4px oklch(0.8 0.11 195 / 0.5);
  }

  .act.sell {
    color: var(--ember);
  }

  .act.sell:hover {
    border-color: oklch(0.8 0.13 80 / 0.5);
    box-shadow: 0 0 14px -4px oklch(0.8 0.13 80 / 0.4);
  }

  @media (max-width: 1000px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>
