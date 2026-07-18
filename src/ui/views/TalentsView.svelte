<script lang="ts">
  import { CLASS_KITS, RESPEC_COST, TALENTS } from '../../engine'
  import type { Game } from '../game.svelte'

  let { game }: { game: Game } = $props()

  const points = $derived(game.progress.talentPoints)
  const kitTalents = $derived(CLASS_KITS[game.progress.classId].talents)
  const spent = $derived(kitTalents.reduce((s, id) => s + game.progress.talentRanks[id], 0))
</script>

<section class="glass pane" aria-label="Talents">
  <header class="head">
    <div>
      <h2>Talents</h2>
      <p class="sub">One point per level. Shape the storm.</p>
    </div>
    <div class="head-right">
      <span class="points" class:has={points > 0}>
        <span class="num">{points}</span> unspent
      </span>
      <button class="respec" disabled={spent === 0 || game.progress.gold < RESPEC_COST} onclick={() => game.respec()}>
        Respec — {RESPEC_COST}g
      </button>
    </div>
  </header>

  <div class="grid">
    {#each kitTalents as id (id)}
      {@const def = TALENTS[id]}
      {@const rank = game.progress.talentRanks[id]}
      <div class="talent" class:maxed={rank >= def.maxRanks}>
        <div class="talent-head">
          <h3>{def.name}</h3>
          <span class="per-rank">{def.perRank}</span>
        </div>
        <p class="desc">{def.description}</p>
        <div class="talent-foot">
          <div class="pips" role="img" aria-label="{rank} of {def.maxRanks} ranks">
            {#each Array.from({ length: def.maxRanks }) as _, i (i)}
              <span class="pip" class:lit={rank > i}></span>
            {/each}
          </div>
          <button
            class="learn"
            disabled={points <= 0 || rank >= def.maxRanks}
            onclick={() => game.spendTalent(id)}
            aria-label="Learn {def.name} rank {rank + 1}"
          >
            {rank >= def.maxRanks ? 'Maxed' : 'Learn'}
          </button>
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .pane {
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  h2 {
    font-size: 21px;
  }

  .sub {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--text-dim);
    font-style: italic;
  }

  .head-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .points {
    font-size: 13px;
    color: var(--text-dim);
  }

  .points.has {
    color: var(--xp);
    font-weight: 620;
  }

  .points .num {
    font-size: 17px;
    font-weight: 680;
  }

  .respec {
    padding: 6px 14px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
    color: var(--arcana);
    border: 1px solid oklch(0.72 0.15 300 / 0.4);
    background: oklch(0.72 0.15 300 / 0.07);
    transition: box-shadow var(--dur-fast) ease, opacity var(--dur-fast) ease;
  }

  .respec:hover:not(:disabled) {
    box-shadow: 0 0 16px -4px oklch(0.72 0.15 300 / 0.5);
  }

  .respec:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
  }

  .talent {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.12);
    background: oklch(0.8 0.02 260 / 0.03);
    transition: border-color var(--dur) ease, box-shadow var(--dur) ease;
  }

  .talent.maxed {
    border-color: oklch(0.72 0.15 300 / 0.4);
    box-shadow: 0 0 18px -8px oklch(0.72 0.15 300 / 0.5);
  }

  .talent-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  h3 {
    font-size: 15.5px;
    font-weight: 600;
  }

  .per-rank {
    font-size: 11px;
    color: var(--xp);
    white-space: nowrap;
  }

  .desc {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-dim);
    line-height: 1.45;
    flex: 1;
  }

  .talent-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .pips {
    display: flex;
    gap: 5px;
  }

  .pip {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: oklch(0.3 0.02 270);
    transition: background var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  }

  .pip.lit {
    background: var(--xp);
    box-shadow: 0 0 8px oklch(0.72 0.15 300 / 0.6);
  }

  .learn {
    padding: 5px 16px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 640;
    cursor: pointer;
    color: var(--text);
    border: 1px solid oklch(0.85 0.03 260 / 0.2);
    background: oklch(0.8 0.02 260 / 0.06);
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease, opacity var(--dur-fast) ease;
  }

  .learn:hover:not(:disabled) {
    border-color: oklch(0.72 0.15 300 / 0.55);
    box-shadow: 0 0 14px -4px oklch(0.72 0.15 300 / 0.5);
  }

  .learn:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
