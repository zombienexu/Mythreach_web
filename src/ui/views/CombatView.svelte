<script lang="ts">
  import type { Game, Impact } from '../game.svelte'
  import ActionBar from '../components/ActionBar.svelte'
  import ArenaFx from '../components/ArenaFx.svelte'
  import EnemyCard from '../components/EnemyCard.svelte'
  import FloatLayer from '../components/FloatLayer.svelte'
  import PlayerCard from '../components/PlayerCard.svelte'

  let { game }: { game: Game } = $props()

  const region = $derived(game.progress.regions.find((r) => r.current))
  const assault = $derived(game.combat.phase === 'assault')
  const looting = $derived(game.combat.phase === 'looting')
  const shown = $derived(game.combat.enemies)

  // Formation: a back rank drawn above and smaller, the front rank ahead of it.
  const back = $derived(shown.filter((e) => e.row === 'back'))
  const front = $derived(shown.filter((e) => e.row !== 'back'))
  const solo = $derived(shown.length === 1)

  const TIER_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', hard: 'Hard' }
  const IDLE_IMPACT: Impact = { n: 0, power: 1, crit: false }
</script>

{#if region}
  <section class="glass banner" style:--zh={region.hue} aria-label="Region">
    <div class="banner-text">
      <h2 class="zone-name">{assault ? 'The Rift Colossus' : region.name}</h2>
      <span class="zone-epithet">{assault ? 'a wound in the sky' : region.epithet}</span>
    </div>
    <span class="tier" class:assault>
      {assault ? 'World Boss' : `${TIER_LABEL[region.tier]} · Lv ${region.minLevel}–${region.maxLevel}`}
    </span>
  </section>
{/if}

<section class="arena" aria-label="Combatants" style:--zh={region?.hue ?? 260}>
  <div class="field" class:solo>
    {#if shown.length > 0}
      <div class="foes" data-fx-row="enemies" role="group" aria-label="Enemies — click or Tab to target">
        {#if back.length > 0}
          <div class="rank back">
            {#each back as enemy (enemy.iid)}
              <EnemyCard
                {enemy}
                lootable={looting}
                targeted={game.combat.target === enemy.iid}
                compact={!solo}
                impact={game.enemyImpacts[enemy.iid] ?? IDLE_IMPACT}
                ontarget={() => game.target(enemy.iid)}
                oncollect={() => game.loot(enemy.iid)}
              />
            {/each}
          </div>
        {/if}
        <div class="rank front">
          {#each front as enemy (enemy.iid)}
            <EnemyCard
              {enemy}
              lootable={looting}
              targeted={game.combat.target === enemy.iid}
              compact={!solo}
              impact={game.enemyImpacts[enemy.iid] ?? IDLE_IMPACT}
              ontarget={() => game.target(enemy.iid)}
              oncollect={() => game.loot(enemy.iid)}
            />
          {/each}
        </div>
      </div>
    {:else}
      <div class="glass card lull">
        <span class="lull-word">{region?.intro ?? 'The dark waits.'}</span>
        <button
          class="start"
          disabled={!game.combat.player.alive}
          onclick={() => game.startFight()}
        >
          {game.combat.player.alive ? 'Start fight' : 'Fallen…'}
        </button>
      </div>
    {/if}
  </div>

  <div class="hero-row">
    <PlayerCard
      player={game.combat.player}
      level={game.progress.level}
      impact={game.impacts.player}
      bloom={game.bloom}
    />
  </div>

  {#if assault}
    <div class="assault-foot">
      <button class="turn-back" onclick={() => game.retreat()}>Break off the assault</button>
    </div>
  {/if}

  {#if looting}
    <div class="loot-foot">
      <button class="loot-all" onclick={() => game.lootAll()}>
        Loot all — <kbd>R</kbd>
      </button>
    </div>
  {/if}

  <ArenaFx {game} />
  <FloatLayer floats={game.floats} />
</section>

<div class="foot">
  <ActionBar
    cast={game.combat.cast}
    queued={game.combat.queued}
    cooldowns={game.combat.cooldowns}
    gcd={game.combat.gcdRemaining}
    usable={game.usable}
    unlocked={game.progress.unlockedAbilities}
    mana={game.combat.player.mana}
    pressedKeys={game.pressed}
    denied={game.denied}
    onactivate={(id) => game.use(id)}
  />
</div>

<style>
  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 12px 22px;
  }

  .banner-text {
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
  }

  .zone-name {
    font-size: 17px;
    font-weight: 590;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
    white-space: nowrap;
  }

  .zone-epithet {
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tier {
    flex: none;
    font-size: 11px;
    font-weight: 640;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    border: 1px solid oklch(0.72 0.13 calc(var(--zh) * 1) / 0.35);
    border-radius: 99px;
    padding: 3px 11px;
  }

  .tier.assault {
    color: var(--ember);
    border-color: oklch(0.72 0.16 40 / 0.5);
  }

  .arena {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    isolation: isolate;
  }

  .arena::before {
    content: '';
    position: absolute;
    inset: -40px -40px -20px;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(58% 34% at 50% 8%, oklch(0.7 0.13 calc(var(--zh) * 1) / 0.1) 0%, transparent 70%),
      radial-gradient(48% 30% at 50% 96%, oklch(0.8 0.11 195 / 0.09) 0%, transparent 70%),
      linear-gradient(180deg, oklch(0.5 0.06 calc(var(--zh) * 1) / 0.05) 0%, transparent 40%);
  }

  /* The freed log space: the field now grows to fill it and centres the pack. */
  .field {
    flex: 1;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .foes {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: 100%;
  }

  .rank {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 14px;
  }

  /* The back rank sits higher, a touch smaller and dimmer — depth without 3D. */
  .rank.back {
    transform: scale(0.86);
    opacity: 0.86;
    margin-bottom: -6px;
  }

  .solo .foes {
    max-width: 460px;
    margin-inline: auto;
  }

  .card {
    flex: 1;
    max-width: 460px;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 18px 22px;
    text-align: center;
    margin-inline: auto;
  }

  .lull {
    opacity: 0.92;
  }

  .lull-word {
    font-family: var(--font-display);
    font-size: 17px;
    font-style: italic;
    letter-spacing: 0.04em;
    color: var(--text-dim);
  }

  /* The one button the whole loop hangs on. */
  .start {
    margin-top: 6px;
    padding: 10px 34px;
    border-radius: 99px;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 640;
    letter-spacing: 0.06em;
    cursor: pointer;
    color: var(--ether);
    border: 1px solid oklch(0.8 0.11 195 / 0.5);
    background: oklch(0.8 0.11 195 / 0.09);
    transition: box-shadow var(--dur-fast) ease, opacity var(--dur-fast) ease;
  }

  .start:hover:not(:disabled) {
    box-shadow: 0 0 22px -4px oklch(0.8 0.11 195 / 0.6);
  }

  .start:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .loot-foot {
    display: flex;
    justify-content: center;
  }

  .loot-all {
    padding: 8px 26px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 640;
    cursor: pointer;
    color: var(--gilt);
    border: 1px solid oklch(0.78 0.1 85 / 0.45);
    background: oklch(0.78 0.1 85 / 0.08);
    transition: box-shadow var(--dur-fast) ease;
  }

  .loot-all:hover {
    box-shadow: 0 0 18px -4px oklch(0.78 0.1 85 / 0.55);
  }

  .loot-all kbd {
    font-family: inherit;
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 5px;
    border: 1px solid oklch(0.78 0.1 85 / 0.4);
    background: oklch(0.78 0.1 85 / 0.1);
  }

  .hero-row {
    margin-top: auto;
    display: flex;
    justify-content: center;
  }

  .hero-row > :global(article) {
    flex: 1;
    max-width: 560px;
  }

  .assault-foot {
    display: flex;
    justify-content: center;
  }

  .turn-back {
    background: none;
    border: 0;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .turn-back:hover {
    color: var(--text);
  }

  .foot {
    margin-top: auto;
    padding-block: 10px 4px;
  }

  @media (max-width: 1000px) {
    .rank {
      gap: 10px;
    }
  }
</style>
