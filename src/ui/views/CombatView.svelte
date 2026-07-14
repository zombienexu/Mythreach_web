<script lang="ts">
  import { BLESSINGS } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Game, Impact } from '../game.svelte'
  import ActionBar from '../components/ActionBar.svelte'
  import ArenaFx from '../components/ArenaFx.svelte'
  import CombatLog from '../components/CombatLog.svelte'
  import EnemyCard from '../components/EnemyCard.svelte'
  import FloatLayer from '../components/FloatLayer.svelte'
  import PlayerCard from '../components/PlayerCard.svelte'
  import TrailRibbon from '../components/TrailRibbon.svelte'

  let { game }: { game: Game } = $props()

  const zone = $derived(game.progress.zones.find((z) => z.current))
  const phase = $derived(game.combat.phase)
  const exp = $derived(game.combat.expedition)

  // The live pack, or the corpses of the last one while we wait.
  const live = $derived(game.combat.enemies.length > 0)
  const shown = $derived(live ? game.combat.enemies : game.lastEnemies)

  const atCamp = $derived(phase === 'camp')
  const traveling = $derived(phase === 'travel')
  const shrinePending = $derived(exp?.pendingShrine != null)
  const nodeResolved = $derived(phase === 'node' && exp?.nodeResolved === true && !live)
  const travelPct = $derived(
    exp && exp.travelTotal > 0 ? 1 - exp.travelRemaining / exp.travelTotal : 0,
  )

  const IDLE_IMPACT: Impact = { n: 0, power: 1, crit: false }
</script>

{#if zone}
  <section class="glass banner" style:--zh={zone.hue} aria-label="Zone">
    <div class="banner-text">
      <h2 class="zone-name">{zone.name}</h2>
      <span class="zone-epithet">{zone.epithet}</span>
    </div>
    <div class="banner-trail">
      {#if exp}
        <TrailRibbon expedition={exp} />
      {:else}
        <span class="at-rest">At rest — the Wayfarer's Rest</span>
      {/if}
    </div>
  </section>
{/if}

<section class="arena" aria-label="Combatants" style:--zh={zone?.hue ?? 260}>
  <div class="foes" data-fx-row="enemies" role="group" aria-label="Enemies — click or Tab to target">
    {#if live}
      {#each shown as enemy (enemy.iid)}
        <EnemyCard
          {enemy}
          {live}
          targeted={game.combat.target === enemy.iid}
          compact={shown.length > 1}
          impact={game.enemyImpacts[enemy.iid] ?? IDLE_IMPACT}
          ontarget={() => game.target(enemy.iid)}
        />
      {/each}
    {:else if atCamp}
      <div class="glass card rest-card">
        <span class="rest-title">The Wayfarer's Rest</span>
        <span class="rest-note">The world waits while you do. Set out when you're ready.</span>
        <div class="rest-actions">
          <button class="seal" onclick={() => game.embark()}>Embark</button>
          {#if !game.progress.companion}
            <button class="seal quiet" onclick={() => game.hire()}>Hire a companion (150g)</button>
          {/if}
          <button class="seal quiet" onclick={() => game.assault()}>Assault the Colossus</button>
        </div>
      </div>
    {:else if shrinePending && exp?.pendingShrine}
      <div class="glass card shrine-card">
        <span class="rest-title">A shrine offers its blessing</span>
        <div class="shrine-choices">
          {#each exp.pendingShrine as id (id)}
            <button class="seal blessing" onclick={() => game.chooseBlessing(id)}>
              <span class="bless-name">{BLESSINGS[id].name}</span>
              <span class="bless-desc">{BLESSINGS[id].description}</span>
            </button>
          {/each}
        </div>
      </div>
    {:else if traveling}
      <div class="glass card travel-card">
        <span class="travel-line">{game.lastFlavor}</span>
        <div class="travel-bar" aria-hidden="true"><div class="travel-fill" style:width="{travelPct * 100}%"></div></div>
      </div>
    {:else if nodeResolved}
      <div class="glass card resolved-card">
        <span class="rest-note">The way ahead is clear.</span>
        <div class="rest-actions">
          <button class="seal" onclick={() => game.advance()}>Press on</button>
          <button class="turn-back" onclick={() => game.retreat()}>Turn back</button>
        </div>
      </div>
    {:else}
      <div class="glass card lull">
        <span class="lull-word">The dark stirs…</span>
        <span class="lull-count num">{ticksToSeconds(game.combat.spawnIn)}s</span>
      </div>
    {/if}
  </div>

  <div class="chronicle">
    <CombatLog entries={game.log} />
  </div>

  <div class="hero-row">
    <PlayerCard
      player={game.combat.player}
      level={game.progress.level}
      impact={game.impacts.player}
      bloom={game.bloom}
    />
  </div>

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

  .banner-trail {
    display: flex;
    align-items: center;
    flex: 1;
    max-width: 460px;
    justify-content: flex-end;
  }

  .at-rest {
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
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

  .foes {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 14px;
    min-height: 150px;
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
  }

  .rest-title {
    font-family: var(--font-display);
    font-size: 19px;
    letter-spacing: 0.04em;
    color: var(--text);
  }

  .rest-note {
    font-size: 12.5px;
    color: var(--text-dim);
  }

  .rest-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 4px;
  }

  .shrine-choices {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .blessing {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 14px;
    max-width: 200px;
  }

  .bless-name {
    font-family: var(--font-display);
    font-size: 13px;
  }

  .bless-desc {
    font-size: 11px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .travel-line {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 15px;
    color: var(--text);
  }

  .travel-bar {
    width: min(280px, 80%);
    height: 4px;
    border-radius: 99px;
    background: oklch(0.2 0.02 270 / 0.75);
    overflow: hidden;
  }

  .travel-fill {
    height: 100%;
    background: var(--gilt, oklch(0.78 0.1 85));
    transition: width 120ms linear;
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

  .lull {
    opacity: 0.85;
  }

  .lull-word {
    font-family: var(--font-display);
    font-size: 19px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .lull-count {
    font-size: 14px;
    font-weight: 620;
    color: var(--text);
  }

  .chronicle > :global(section) {
    height: clamp(130px, 20vh, 320px);
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

  .foot {
    margin-top: auto;
    padding-block: 10px 4px;
  }

  @media (max-width: 1000px) {
    .foes {
      gap: 10px;
    }
  }
</style>
