<script lang="ts">
  /** THE TALENTS SCREEN — where the Weave is actually learned.
   *
   *  The Legion *offers* a working the moment your Standing earns it, but it
   *  never shoves a new spell into your hands mid-swing. The offer waits here,
   *  under a badge on the rail, until you have the quiet to sit down with it.
   *  Fireball alone is exempt: the First Weaving is pressed on you in the yard,
   *  because that ceremony is the whole point of the camp.
   *
   *  The same screen holds the honing below it — the talent points a level pays
   *  out, spent into the calling's own dials. */
  import { ABILITIES, CLASS_KITS, TALENTS } from '../../../engine'
  import AbilityIcon from '../../components/icons/AbilityIcon.svelte'
  import type { Game } from '../../game.svelte'
  import { GRACE_TIERS } from '../content'

  let { game }: { game: Game } = $props()

  const ex = $derived(game.expedition)
  const learned = $derived(new Set(game.taught))
  const pending = $derived(game.pendingLearns)

  const kit = $derived(CLASS_KITS[game.progress.classId])
  const points = $derived(game.progress.talentPoints)
  const ranks = $derived(game.progress.talentRanks)
</script>

<div class="talents">
  <!-- ── the offers: workings waiting to be taken up ─────────── -->
  <section class="panel console-panel ticked" class:calling={pending.length > 0}>
    <header class="phead">
      <span class="readout">the weave · offered by the legion</span>
      <span class="phead-sub">
        {pending.length > 0
          ? 'the drill-yard has time for this — take it up when you are ready'
          : 'nothing waiting; earn standing and the Legion will offer more'}
      </span>
    </header>

    {#if pending.length > 0}
      <div class="offers">
        {#each pending as id (id)}
          {@const def = ABILITIES[id]}
          <div class="offer">
            <span class="ic" style:--tone="var(--tone-{id})"><AbilityIcon {id} /></span>
            <div class="offer-body">
              <span class="offer-name">{def?.name ?? id}</span>
              <p class="offer-desc">{def?.description ?? ''}</p>
            </div>
            <button class="seal learn" onclick={() => game.learn(id)}>Learn it</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty-note">
        Every working the Legion has trusted you with is already in your hands.
      </p>
    {/if}
  </section>

  <!-- ── the Grace ladder: what is taught, and when ──────────── -->
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
                {@const known = learned.has(id)}
                {@const offered = reached && !known}
                <div class="spell" class:known>
                  <span class="ic small" style:--tone="var(--tone-{id})"><AbilityIcon {id} /></span>
                  <span class="sname">{ABILITIES[id]?.name ?? id}</span>
                  {#if offered}
                    <button class="chip-learn" onclick={() => game.learn(id)}>learn</button>
                  {:else if !known}
                    <span class="lock readout">sealed</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <!-- ── the honing: talent points ───────────────────────────── -->
  <section class="panel console-panel ticked">
    <header class="phead">
      <span class="readout">the honing · {points} {points === 1 ? 'point' : 'points'} unspent</span>
      <span class="phead-sub">a level pays a point — spend it into the calling's own dials</span>
    </header>
    <div class="tal-grid">
      {#each kit.talents as id (id)}
        {@const def = TALENTS[id]}
        {@const rank = ranks[id] ?? 0}
        {@const maxed = rank >= def.maxRanks}
        <div class="tal" class:maxed class:spent={rank > 0}>
          <div class="tal-top">
            <span class="tal-name">{def.name}</span>
            <span class="pips" aria-label="rank {rank} of {def.maxRanks}">
              {#each Array(def.maxRanks) as _, r (r)}
                <span class="pip" class:on={r < rank}></span>
              {/each}
            </span>
          </div>
          <p class="tal-desc">{def.description}</p>
          <div class="tal-foot">
            <span class="per mono">{def.perRank} / rank</span>
            <button
              class="ghost-btn"
              disabled={maxed || points <= 0}
              onclick={() => game.spendTalent(id)}
            >
              {maxed ? 'Mastered' : 'Spend'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .talents {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 20px;
  }
  .panel {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  /* an offer waiting is worth a glow: the rail badge sent you here */
  .panel.calling {
    border-color: oklch(0.72 0.19 45 / 0.5);
    box-shadow: 0 0 34px -18px oklch(0.72 0.19 45 / 0.8);
  }
  .phead {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }
  .phead-sub {
    font-size: 11.5px;
    font-style: italic;
    color: var(--text-dim);
  }
  .empty-note {
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
  }

  /* ---- the offers ------------------------------------------------- */
  .offers {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .offer {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.06);
    animation: offer-in 420ms var(--ease-out-expo) both;
  }
  @keyframes offer-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .ic {
    flex: none;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--tone);
    border: 1px solid oklch(0.72 0.19 45 / 0.45);
    background: radial-gradient(circle, oklch(0.72 0.19 45 / 0.16), transparent 70%);
    box-shadow: 0 0 22px -8px oklch(0.72 0.19 45 / 0.7);
  }
  .ic.small {
    width: 26px;
    height: 26px;
    box-shadow: none;
  }
  .offer-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .offer-name {
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--ember-glow);
  }
  .offer-desc {
    font-size: 12px;
    line-height: 1.5;
    font-style: italic;
    color: var(--text-dim);
  }
  .learn {
    flex: none;
    padding: 9px 20px;
    font-size: 13px;
  }

  /* ---- the ladder ------------------------------------------------- */
  .ladder {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .tier {
    display: flex;
    gap: 12px;
    opacity: 0.55;
  }
  .tier.reached {
    opacity: 1;
  }
  .tier-mark {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 5px;
  }
  .node {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1px solid var(--console-line);
  }
  .node.on {
    background: var(--ember-glow);
    border-color: var(--ember-glow);
    box-shadow: 0 0 10px oklch(0.72 0.19 45 / 0.7);
  }
  .wire {
    flex: 1;
    width: 1px;
    min-height: 26px;
    background: var(--console-line);
  }
  .wire.on {
    background: linear-gradient(180deg, var(--ember-war), var(--console-line));
  }
  .tier-body {
    flex: 1;
    padding-bottom: 12px;
  }
  .tier-top {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .tier-name {
    font-family: var(--font-display);
    font-size: 15px;
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
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 5px;
  }
  .spell {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    opacity: 0.6;
  }
  .spell.known {
    opacity: 1;
  }
  .sname {
    font-size: 12.5px;
    color: var(--text);
  }
  .lock {
    font-size: 9px;
    opacity: 0.7;
  }
  .chip-learn {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 99px;
    cursor: pointer;
    color: var(--ember-glow);
    border: 1px solid oklch(0.72 0.19 45 / 0.55);
    background: oklch(0.72 0.19 45 / 0.1);
  }
  .chip-learn:hover {
    filter: brightness(1.2);
  }

  /* ---- the honing ------------------------------------------------- */
  .tal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .tal {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 13px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-line);
    background: oklch(0.5 0.03 250 / 0.05);
  }
  .tal.spent {
    border-color: oklch(0.72 0.19 45 / 0.3);
  }
  .tal.maxed {
    border-color: oklch(0.78 0.1 85 / 0.45);
  }
  .tal-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .tal-name {
    font-family: var(--font-display);
    font-size: 13.5px;
    color: var(--text);
  }
  .pips {
    display: inline-flex;
    gap: 3px;
  }
  .pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    border: 1px solid var(--console-line);
  }
  .pip.on {
    background: var(--ember-glow);
    border-color: var(--ember-glow);
  }
  .tal-desc {
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .tal-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 2px;
  }
  .per {
    font-size: 10px;
    color: var(--signal-dim);
  }
  .ghost-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    .offer {
      animation: none;
    }
  }
</style>
