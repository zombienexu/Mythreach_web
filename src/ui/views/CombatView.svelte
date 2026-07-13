<script lang="ts">
  import { BOSS_KILLS_REQUIRED } from '../../engine'
  import type { Game } from '../game.svelte'
  import ActionBar from '../components/ActionBar.svelte'
  import CombatLog from '../components/CombatLog.svelte'
  import EnemyCard from '../components/EnemyCard.svelte'
  import PlayerCard from '../components/PlayerCard.svelte'

  let { game }: { game: Game } = $props()

  const zone = $derived(game.progress.zones.find((z) => z.current))
  const playerFloats = $derived(game.floats.filter((f) => f.side === 'player'))
  const enemyFloats = $derived(game.floats.filter((f) => f.side === 'enemy'))
  const bossOnField = $derived(
    game.combat.enemy?.rank === 'boss' || (game.combat.enemy === null && game.combat.spawnKind === 'boss'),
  )
</script>

{#if zone}
  <section class="glass banner" style:--zh={zone.hue} aria-label="Zone">
    <div class="banner-text">
      <h2 class="zone-name">{zone.name}</h2>
      <span class="zone-epithet">{zone.epithet}</span>
    </div>
    <div class="banner-boss">
      {#if zone.bossDefeated}
        <span class="boss-state done" title="This boss has already fallen — challenge again for loot">✦ {zone.bossName} defeated</span>
      {:else if zone.bossReady}
        <span class="boss-state ready">{zone.bossName} awaits</span>
      {:else}
        <span class="boss-state num">{Math.min(zone.kills, BOSS_KILLS_REQUIRED)} / {BOSS_KILLS_REQUIRED} kills to the boss</span>
      {/if}
      <div class="pips" aria-hidden="true">
        {#each Array.from({ length: BOSS_KILLS_REQUIRED }) as _, i (i)}
          <span class="pip" class:lit={zone.kills > i}></span>
        {/each}
      </div>
      <button
        class="challenge"
        disabled={!zone.bossReady || bossOnField || !game.combat.player.alive}
        onclick={() => game.challengeBoss()}
      >
        {bossOnField ? 'Boss engaged' : 'Challenge'}
      </button>
    </div>
  </section>
{/if}

<section class="arena" aria-label="Combatants">
  <PlayerCard
    player={game.combat.player}
    level={game.progress.level}
    floats={playerFloats}
    impact={game.impacts.player}
    bloom={game.bloom}
  />
  <EnemyCard
    enemy={game.combat.enemy}
    lastEnemy={game.lastEnemy}
    spawnIn={game.combat.spawnIn}
    spawnKind={game.combat.spawnKind}
    bossName={zone?.bossName ?? ''}
    floats={enemyFloats}
    impact={game.impacts.enemy}
  />
</section>

<CombatLog entries={game.log} />

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

  .banner-boss {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: none;
  }

  .boss-state {
    font-size: 12px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .boss-state.ready {
    color: var(--ember);
    font-weight: 620;
    animation: ready-throb 1.2s ease-in-out infinite alternate;
  }

  .boss-state.done {
    color: var(--text-dim);
  }

  @keyframes ready-throb {
    from {
      opacity: 0.7;
    }
    to {
      opacity: 1;
    }
  }

  .pips {
    display: flex;
    gap: 4px;
  }

  .pip {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: oklch(0.3 0.02 270);
    transition: background var(--dur) ease, box-shadow var(--dur) ease;
  }

  .pip.lit {
    background: oklch(0.72 0.13 calc(var(--zh) * 1));
    box-shadow: 0 0 8px oklch(0.72 0.13 calc(var(--zh) * 1) / 0.6);
  }

  .challenge {
    padding: 7px 18px;
    border-radius: 99px;
    border: 1px solid oklch(0.8 0.13 80 / 0.5);
    background: oklch(0.8 0.13 80 / 0.1);
    color: var(--ember);
    font-size: 13px;
    font-weight: 640;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition:
      box-shadow var(--dur-fast) ease,
      transform var(--dur-fast) var(--ease-spring),
      opacity var(--dur-fast) ease;
  }

  .challenge:hover:not(:disabled) {
    box-shadow: 0 0 20px -4px oklch(0.8 0.13 80 / 0.6);
    transform: translateY(-1px);
  }

  .challenge:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .arena {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .foot {
    margin-top: auto;
    padding-block: 10px 4px;
  }

  @media (max-width: 1000px) {
    .arena {
      gap: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .boss-state.ready {
      animation: none;
    }
  }
</style>
