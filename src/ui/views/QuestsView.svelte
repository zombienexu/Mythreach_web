<script lang="ts">
  import { MAX_ACTIVE_QUESTS, type QuestView } from '../../engine'
  import Bar from '../components/Bar.svelte'
  import type { Game } from '../game.svelte'

  let { game }: { game: Game } = $props()

  // The board, grouped by region in region order.
  const groups = $derived(
    game.progress.regions
      .map((region) => ({
        region,
        quests: game.progress.quests.filter((q) => q.regionId === region.id),
      }))
      .filter((g) => g.quests.length > 0),
  )

  // Active and complete quests both hold one of the three slots.
  const slotsUsed = $derived(
    game.progress.quests.filter((q) => q.state === 'active' || q.state === 'complete').length,
  )
  const slotsFull = $derived(slotsUsed >= MAX_ACTIVE_QUESTS)

  function objectiveLine(q: QuestView): string {
    if (q.objective.kind === 'collect') return `Collect ${q.objective.count} × ${q.objective.targetName}`
    if (q.objective.targetName === 'any foe') return `Slay ${q.objective.count} foes here`
    return `Slay ${q.objective.count} × ${q.objective.targetName}`
  }

  function rewardLine(q: QuestView): string {
    const parts = [`${q.reward.xp} xp`, `${q.reward.gold} gold`]
    if (q.reward.gear) parts.push(`${q.reward.gear.minRarity} gear`)
    return parts.join(' · ')
  }
</script>

<section class="board" aria-label="Quests">
  <p class="slots num" class:full={slotsFull}>
    {slotsUsed} / {MAX_ACTIVE_QUESTS} quests underway
  </p>

  {#each groups as group (group.region.id)}
    <div class="group" style:--zh={group.region.hue}>
      <h2 class="region-name rule">{group.region.name}</h2>
      <div class="cards">
        {#each group.quests as quest (quest.id)}
          <article class="glass quest" class:done={quest.state === 'done'}>
            <header class="head">
              <!-- the traveler's wax seal, pressed with their initial -->
              <span class="seal-mark" aria-hidden="true">{quest.giver.charAt(0)}</span>
              <h3 class="qname">{quest.name}</h3>
              <span class="giver">— {quest.giver}</span>
            </header>
            <p class="ask">“{quest.text}”</p>
            <p class="objective">{objectiveLine(quest)}</p>

            {#if quest.state === 'active' || quest.state === 'complete'}
              <div class="progress">
                <Bar
                  value={quest.objective.progress}
                  max={quest.objective.count}
                  kind="xp"
                  height={7}
                  label="{quest.name} progress"
                />
                <span class="count num">{quest.objective.progress} / {quest.objective.count}</span>
              </div>
            {/if}

            <footer class="foot">
              <span class="reward" class:gilded={quest.reward.gear !== null}>{rewardLine(quest)}</span>
              {#if quest.state === 'available'}
                <button
                  class="act accept"
                  disabled={slotsFull}
                  title={slotsFull ? 'Three quests are already underway' : ''}
                  onclick={() => game.acceptQuest(quest.id)}
                >
                  Accept
                </button>
              {:else if quest.state === 'active'}
                <button class="act abandon" onclick={() => game.abandonQuest(quest.id)}>Abandon</button>
              {:else if quest.state === 'complete'}
                <button class="act turnin" onclick={() => game.turnInQuest(quest.id)}>Turn in</button>
              {:else}
                <span class="done-word">Done</span>
              {/if}
            </footer>
          </article>
        {/each}
      </div>
    </div>
  {/each}
</section>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 22px;
    align-content: start;
  }

  .slots {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .slots.full {
    color: var(--gilt);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .region-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .quest {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 2px solid oklch(0.72 0.13 calc(var(--zh) * 1) / 0.45);
    transition: opacity var(--dur) ease;
  }

  .quest.done {
    opacity: 0.45;
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  .seal-mark {
    align-self: center;
    width: 24px;
    height: 24px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 640;
    color: oklch(0.9 0.05 40);
    background: radial-gradient(circle at 35% 30%, oklch(0.58 0.16 30), var(--seal) 70%);
    border: 1px solid oklch(0.78 0.1 85 / 0.45);
    box-shadow:
      0 0 10px -3px oklch(0.55 0.16 30 / 0.8),
      inset 0 -1px 2px oklch(0.3 0.12 30 / 0.8);
  }

  .quest.done .seal-mark {
    filter: saturate(0.3);
  }

  .qname {
    font-size: 15.5px;
    font-weight: 620;
    color: var(--text);
  }

  .giver {
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .ask {
    margin: 0;
    font-size: 12px;
    font-style: italic;
    line-height: 1.5;
    color: var(--text-dim);
    flex: 1;
  }

  .objective {
    margin: 0;
    font-size: 12.5px;
    font-weight: 620;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
  }

  .progress {
    display: grid;
    gap: 3px;
  }

  .count {
    font-size: 10.5px;
    color: var(--text-dim);
  }

  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    min-height: 30px;
  }

  .reward {
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .reward.gilded {
    color: var(--gilt);
  }

  .act {
    padding: 5px 16px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 640;
    cursor: pointer;
    transition: box-shadow var(--dur-fast) ease, opacity var(--dur-fast) ease;
  }

  .accept {
    color: var(--ether);
    border: 1px solid oklch(0.8 0.11 195 / 0.4);
    background: oklch(0.8 0.11 195 / 0.07);
  }

  .accept:hover:not(:disabled) {
    box-shadow: 0 0 16px -4px oklch(0.8 0.11 195 / 0.5);
  }

  .accept:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .abandon {
    color: var(--text-dim);
    border: 0;
    background: none;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .abandon:hover {
    color: var(--text);
  }

  .turnin {
    color: var(--gilt);
    border: 1px solid oklch(0.78 0.1 85 / 0.55);
    background: oklch(0.78 0.1 85 / 0.12);
    box-shadow: 0 0 14px -4px oklch(0.78 0.1 85 / 0.5);
  }

  .turnin:hover {
    box-shadow: 0 0 20px -2px oklch(0.78 0.1 85 / 0.7);
  }

  .done-word {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
</style>
