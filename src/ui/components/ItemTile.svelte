<script lang="ts">
  import type { Item, StatId } from '../../engine'
  import { STAT_LABEL } from '../format'

  let {
    item,
    compare = null,
  }: {
    item: Item
    /** currently equipped piece in the same slot — renders +/− deltas */
    compare?: Item | null
  } = $props()

  const SLOT_LABEL: Record<Item['slot'], string> = {
    staff: 'Staff',
    hood: 'Hood',
    robe: 'Robe',
    ring: 'Ring',
    trinket: 'Trinket',
  }

  const STATS: StatId[] = ['power', 'stamina', 'spirit', 'crit']
  const rows = $derived(
    STATS.map((stat) => {
      const value = item.stats[stat] ?? 0
      const other = compare?.stats[stat] ?? 0
      return { stat, value, delta: value - other }
    }).filter((r) => r.value > 0 || (compare && r.delta !== 0)),
  )
</script>

<div class="item {item.rarity}">
  <div class="head">
    <span class="iname">{item.name}</span>
  </div>
  <div class="meta">
    <span>{SLOT_LABEL[item.slot]}</span>
    <span class="num">ilvl {item.ilvl}</span>
  </div>
  <ul class="stats">
    {#each rows as row (row.stat)}
      <li>
        <span class="stat-name">{STAT_LABEL[row.stat]}</span>
        <span class="stat-val num">
          +{row.value}{row.stat === 'crit' ? '%' : ''}
          {#if compare && row.delta !== 0}
            <span class="delta num" class:up={row.delta > 0} class:down={row.delta < 0}>
              ({row.delta > 0 ? '+' : ''}{row.delta})
            </span>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .item {
    --edge: var(--rarity-common);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid color-mix(in oklch, var(--edge) 40%, transparent);
    background: color-mix(in oklch, var(--edge) 5%, transparent);
    min-width: 0;
  }

  .uncommon {
    --edge: var(--rarity-uncommon);
  }
  .rare {
    --edge: var(--rarity-rare);
  }
  .epic {
    --edge: var(--rarity-epic);
    box-shadow: 0 0 16px -6px color-mix(in oklch, var(--edge) 60%, transparent);
  }

  .iname {
    font-size: 13px;
    font-weight: 620;
    color: var(--edge);
    line-height: 1.3;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .stats {
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
    display: grid;
    gap: 1px;
  }

  li {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .stat-name {
    color: var(--text-dim);
  }

  .stat-val {
    font-weight: 600;
  }

  .delta.up {
    color: var(--life);
  }

  .delta.down {
    color: var(--wound);
  }
</style>
