<script lang="ts">
  import { ABILITIES } from '../../../engine'
  import AbilityIcon from '../../components/icons/AbilityIcon.svelte'
  import ItemTile from '../../components/ItemTile.svelte'
  import type { Game } from '../../game.svelte'
  import { GRACE_TIERS, SERGEANT, STANDING_PER_CHARGE } from '../content'

  let { game }: { game: Game } = $props()

  const ex = $derived(game.expedition)
  const taught = $derived(new Set(game.taught))

  const SLOTS = ['staff', 'hood', 'robe', 'ring', 'trinket'] as const
  const SLOT_LABEL: Record<(typeof SLOTS)[number], string> = {
    staff: 'Staff',
    hood: 'Hood',
    robe: 'Robe',
    ring: 'Ring',
    trinket: 'Trinket',
  }

  const quests = $derived(game.progress.quests)
  // total active across all fronts (the Legion's cap is shared)
  const activeCount = $derived(quests.filter((q) => q.state === 'active').length)

  const STATE_ORDER: Record<string, number> = { complete: 0, active: 1, available: 2, done: 3 }
  // Orders are scoped to the front you're deployed on — the sergeant here only
  // knows this front's work.
  const orders = $derived(
    quests
      .filter((q) => q.regionId === game.progress.regionId)
      .sort((a, b) => (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9)),
  )
  const currentRegion = $derived(game.progress.regions.find((r) => r.current))
</script>

<div class="dossier">
  <!-- ── Standing ─────────────────────────────────────────── -->
  <section class="panel console-panel ticked hero-panel">
    <div class="rank-block">
      <span class="readout">rank · the ember legion</span>
      <h2 class="rank-name">{ex.tier.name}</h2>
      <p class="rank-note">
        {#if ex.nextTier}
          <span class="mono">{ex.standing}</span> standing —
          <span class="mono">{ex.nextTier.at - ex.standing}</span> to
          <span class="next">{ex.nextTier.name}</span>
        {:else}
          <span class="mono">{ex.standing}</span> standing — the Legion trusts you fully.
        {/if}
      </p>
      <div class="meter big-meter">
        <span class="fill grace" style:width="{Math.round(ex.graceProgress * 100)}%"></span>
      </div>
    </div>
    <p class="how">
      Trust is earned in blood and errands — every foe felled, every Charge turned in. Cross a
      threshold and the Legion teaches you the next working of the Weave.
    </p>
  </section>

  <!-- ── Teaching (the Grace ladder) ──────────────────────── -->
  <section class="panel console-panel ticked">
    <header class="phead">
      <span class="readout">war-weaving · taught by grace</span>
      <span class="phead-sub">access, not level — power still comes from the fight</span>
    </header>
    <ol class="ladder">
      {#each GRACE_TIERS as tier, i (tier.key)}
        {@const reached = ex.tierIndex >= i}
        <li class="tier" class:reached class:current={ex.tierIndex === i}>
          <div class="tier-mark">
            <span class="node" class:on={reached}></span>
            {#if i < GRACE_TIERS.length - 1}<span class="wire" class:on={ex.tierIndex > i}></span>{/if}
          </div>
          <div class="tier-body">
            <div class="tier-top">
              <span class="tier-name">{tier.name}</span>
              <span class="tier-at mono">{tier.at === 0 ? 'start' : `${tier.at} standing`}</span>
            </div>
            <div class="teaches">
              {#each tier.teaches as id (id)}
                {@const known = taught.has(id)}
                <div class="spell" class:known>
                  <span class="ic" style:--tone="var(--tone-{id})"><AbilityIcon {id} /></span>
                  <span class="sname">{ABILITIES[id]?.name ?? id}</span>
                  {#if !known}<span class="lock readout">sealed</span>{/if}
                </div>
              {/each}
            </div>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <!-- ── Loadout ──────────────────────────────────────────── -->
  <section class="panel console-panel ticked">
    <header class="phead">
      <span class="readout">loadout</span>
      <span class="phead-sub">issued kit — power, stamina, spirit, crit</span>
    </header>
    <div class="equipped">
      {#each SLOTS as slot (slot)}
        {@const item = game.progress.equipped[slot]}
        <div class="slot {item?.rarity ?? 'empty'}">
          <span class="slot-label readout">{SLOT_LABEL[slot]}</span>
          <span class="slot-name">{item?.name ?? '—'}</span>
          {#if item}<span class="slot-ilvl mono">ilvl {item.ilvl}</span>{/if}
        </div>
      {/each}
    </div>

    <div class="bags">
      {#if game.progress.inventory.length === 0}
        <p class="empty-note">Bags empty. Strip the field after a fight to fill them.</p>
      {:else}
        {#each game.progress.inventory as item (item.uid)}
          <div class="bag-item">
            <ItemTile {item} compare={game.progress.equipped[item.slot] ?? null} />
            <div class="bag-actions">
              <button class="ghost-btn" onclick={() => game.equip(item)}>Equip</button>
              <button class="ghost-btn sell" onclick={() => game.sell(item)}>Sell</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </section>

  <!-- ── Orders (charges, scoped to the current front) ────── -->
  <section class="panel console-panel ticked">
    <header class="phead">
      <span class="readout">orders · {SERGEANT} · {currentRegion?.name ?? 'the front'}</span>
      <span class="phead-sub">{activeCount}/3 underway — each pays standing &amp; coin</span>
    </header>
    <div class="charges">
      {#each orders as q (q.id)}
        <div class="charge {q.state}">
          <div class="charge-main">
            <div class="charge-top">
              <span class="charge-name">{q.name}</span>
              <span class="charge-state readout">{q.state}</span>
            </div>
            <p class="charge-giver">{q.giver} · {q.regionName}</p>
            <p class="charge-obj">
              {q.objective.kind === 'kill' ? 'Fell' : 'Gather'} {q.objective.targetName}
              <span class="mono">{q.objective.progress}/{q.objective.count}</span>
            </p>
            <div class="meter thin">
              <span
                class="fill obj"
                style:width="{Math.min(100, (q.objective.progress / q.objective.count) * 100)}%"
              ></span>
            </div>
          </div>
          <div class="charge-side">
            <div class="reward mono">
              <span class="r-xp">+{q.reward.xp} xp</span>
              <span class="r-gold ember">+{q.reward.gold}g</span>
              <span class="r-standing">+{STANDING_PER_CHARGE} standing</span>
            </div>
            {#if q.state === 'available'}
              <button class="uplink-btn small" disabled={activeCount >= 3} onclick={() => game.acceptQuest(q.id)}>
                Accept
              </button>
            {:else if q.state === 'active'}
              <button class="ghost-btn" onclick={() => game.abandonQuest(q.id)}>Abandon</button>
            {:else if q.state === 'complete'}
              <button class="uplink-btn small pulse" onclick={() => game.turnInQuest(q.id)}>Turn in ▸</button>
            {:else}
              <span class="done readout">✓ done</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .dossier {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .panel {
    padding: 18px 20px;
  }
  .phead {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .phead-sub {
    font-size: 11px;
    color: var(--text-dim);
    font-style: italic;
  }

  /* ── standing ── */
  .hero-panel {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 1fr;
    gap: 24px;
    align-items: center;
  }
  .rank-name {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 560;
    color: var(--ember-glow);
    margin: 2px 0 4px;
  }
  .rank-note {
    font-size: 12.5px;
    color: var(--text-dim);
    margin-bottom: 12px;
  }
  .next {
    color: var(--ember-glow);
  }
  .big-meter {
    height: 10px;
  }
  .fill.grace {
    background: linear-gradient(90deg, var(--ember-war), var(--ember-glow));
    box-shadow: 0 0 10px oklch(0.72 0.19 45 / 0.5);
  }
  .how {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  /* ── ladder ── */
  .ladder {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .tier {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 12px;
  }
  .tier-mark {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .node {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--console-edge);
    margin-top: 4px;
    flex: none;
  }
  .node.on {
    background: var(--ember-war);
    border-color: var(--ember-glow);
    box-shadow: 0 0 10px oklch(0.72 0.19 45 / 0.6);
  }
  .wire {
    width: 1.5px;
    flex: 1;
    min-height: 22px;
    background: var(--console-line);
  }
  .wire.on {
    background: linear-gradient(180deg, var(--ember-glow), var(--console-line));
  }
  .tier-body {
    padding-bottom: 16px;
  }
  .tier-top {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .tier-name {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--text-dim);
  }
  .tier.reached .tier-name {
    color: var(--text);
  }
  .tier.current .tier-name {
    color: var(--ember-glow);
  }
  .tier-at {
    font-size: 10px;
    color: var(--signal-dim);
  }
  .teaches {
    display: flex;
    gap: 14px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .spell {
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.4;
    filter: grayscale(0.7);
  }
  .spell.known {
    opacity: 1;
    filter: none;
  }
  .ic {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    color: var(--tone);
    border: 1px solid oklch(0.72 0.19 45 / 0.25);
    background: oklch(0.72 0.19 45 / 0.06);
  }
  .sname {
    font-size: 12.5px;
    color: var(--text);
  }
  .lock {
    font-size: 8px;
    color: var(--signal-dim);
  }

  /* ── loadout ── */
  .equipped {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .slot {
    padding: 9px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-line);
    background: oklch(0.5 0.02 230 / 0.04);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .slot.empty {
    opacity: 0.5;
  }
  .slot-name {
    font-size: 12px;
    color: var(--text);
    line-height: 1.2;
  }
  .slot-ilvl {
    font-size: 9.5px;
    color: var(--signal-dim);
  }
  .slot.uncommon {
    border-color: oklch(0.78 0.14 145 / 0.4);
  }
  .slot.rare {
    border-color: oklch(0.74 0.12 245 / 0.4);
  }
  .slot.epic {
    border-color: oklch(0.72 0.16 305 / 0.4);
  }

  .bags {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
  }
  .empty-note {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
  }
  .bag-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bag-actions {
    display: flex;
    gap: 6px;
  }
  .bag-actions .ghost-btn {
    flex: 1;
    text-align: center;
  }
  .sell:hover {
    border-color: var(--ember);
    color: var(--ember);
  }

  /* ── charges ── */
  .charges {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .charge {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-line);
    background: oklch(0.5 0.02 230 / 0.03);
  }
  .charge.complete {
    border-color: oklch(0.72 0.19 45 / 0.4);
    background: oklch(0.72 0.19 45 / 0.05);
  }
  .charge.done {
    opacity: 0.5;
  }
  .charge-top {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .charge-name {
    font-family: var(--font-display);
    font-size: 14.5px;
    color: var(--text);
  }
  .charge-state {
    font-size: 8.5px;
  }
  .charge.complete .charge-state {
    color: var(--ember-glow);
  }
  .charge-giver {
    font-size: 11px;
    color: var(--text-dim);
    margin: 2px 0 6px;
  }
  .charge-obj {
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 6px;
  }
  .charge-obj .mono {
    color: var(--text);
    margin-left: 4px;
  }
  .meter.thin {
    height: 4px;
    max-width: 260px;
  }
  .fill.obj {
    background: var(--signal);
  }
  .charge-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
  }
  .reward {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    font-size: 10.5px;
  }
  .r-xp {
    color: var(--arcana);
  }
  .r-standing {
    color: var(--ember-glow);
  }
  .uplink-btn.small,
  .charge-side .ghost-btn {
    padding: 7px 14px;
    font-size: 10.5px;
  }
  .uplink-btn.small.pulse {
    animation: turnin 1.6s ease-in-out infinite;
  }
  @keyframes turnin {
    50% {
      filter: brightness(1.2);
      box-shadow: 0 0 0 1px oklch(0.84 0.12 205 / 0.6), 0 0 20px oklch(0.72 0.19 45 / 0.5);
    }
  }
  .done {
    color: var(--ember-glow);
  }

  @media (max-width: 760px) {
    .hero-panel {
      grid-template-columns: 1fr;
    }
    .equipped {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .uplink-btn.small.pulse {
      animation: none;
    }
  }
</style>
