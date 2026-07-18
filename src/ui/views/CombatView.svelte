<script lang="ts">
  import type { Game, Impact } from '../game.svelte'
  import AbilityWheel, { type HubMode } from '../components/AbilityWheel.svelte'
  import ArenaFx from '../components/ArenaFx.svelte'
  import ClassResource from '../components/ClassResource.svelte'
  import EnemyFigure from '../components/EnemyFigure.svelte'
  import FloatLayer from '../components/FloatLayer.svelte'
  import HeroHud from '../components/HeroHud.svelte'

  let { game }: { game: Game } = $props()

  const region = $derived(game.progress.regions.find((r) => r.current))
  const assault = $derived(game.combat.phase === 'assault')
  const looting = $derived(game.combat.phase === 'looting')
  const shown = $derived(game.combat.enemies)

  // Formation: a back rank standing a step deeper into the dark.
  const back = $derived(shown.filter((e) => e.row === 'back'))
  const front = $derived(shown.filter((e) => e.row !== 'back'))
  const solo = $derived(shown.length === 1)

  const TIER_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', hard: 'Hard' }
  const IDLE_IMPACT: Impact = { n: 0, power: 1, crit: false }

  // What the heart of the wheel offers: summon in the lull, spoils after the
  // kill, the cast in flight while the fight is on.
  const hub: HubMode = $derived(
    !game.combat.player.alive ? 'fallen' : looting ? 'collect' : shown.length === 0 ? 'summon' : 'focus',
  )

  /** A stable, organic scatter per figure — the pack stands loosely, not in a
   *  row of chairs. Derived from the iid so it never jitters between ticks. */
  function seat(iid: number): string {
    const bob = ((iid * 37) % 5) * 5 - 10
    const dur = 5.6 + ((iid * 13) % 4) * 0.9
    const delay = -(((iid * 7) % 50) / 10)
    return `--bob: ${bob}px; --drift-dur: ${dur}s; --drift-delay: ${delay}s;`
  }
</script>

<section class="arena" aria-label="Combat" style:--zh={region?.hue ?? 260}>
  {#if region}
    <!-- the region written straight on the dark — a chapter heading, not a plaque -->
    <header class="chapter" class:assault aria-label="Region">
      <div class="chapter-line rule mid">
        <h2 class="zone-name">{assault ? 'The Rift Colossus' : region.name}</h2>
      </div>
      <div class="chapter-sub">
        <span class="zone-epithet">{assault ? 'a wound in the sky' : region.epithet}</span>
        <span class="sep">—</span>
        <span class="tier">
          {assault ? 'World Boss' : `${TIER_LABEL[region.tier]} · Lv ${region.minLevel}–${region.maxLevel}`}
        </span>
      </div>
    </header>
  {/if}

  <div class="field" class:solo>
    {#if shown.length > 0}
      <div class="foes" data-fx-row="enemies" role="group" aria-label="Enemies — click or Tab to target">
        {#if back.length > 0}
          <div class="rank back">
            {#each back as enemy (enemy.iid)}
              <div class="spot" style={seat(enemy.iid)}>
                <EnemyFigure
                  {enemy}
                  stance="back"
                  lootable={looting}
                  targeted={game.combat.target === enemy.iid}
                  impact={game.enemyImpacts[enemy.iid] ?? IDLE_IMPACT}
                  ontarget={() => game.target(enemy.iid)}
                  oncollect={() => game.loot(enemy.iid)}
                />
              </div>
            {/each}
          </div>
        {/if}
        <div class="rank front">
          {#each front as enemy (enemy.iid)}
            <div class="spot" style={seat(enemy.iid)}>
              <EnemyFigure
                {enemy}
                stance={solo ? 'solo' : 'front'}
                lootable={looting}
                targeted={game.combat.target === enemy.iid}
                impact={game.enemyImpacts[enemy.iid] ?? IDLE_IMPACT}
                ontarget={() => game.target(enemy.iid)}
                oncollect={() => game.loot(enemy.iid)}
              />
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- The lull: only the region's words hang in the air; the summons is
           the heart of the wheel below. -->
      <div class="lull">
        <span class="lull-word">{region?.intro ?? 'The dark waits.'}</span>
        <span class="lull-hint">press <kbd>Space</kbd> — or the heart of the wheel</span>
      </div>
    {/if}
  </div>

  <!-- the helm: hero to port, the orrery amidships, the calling to starboard -->
  <div class="helm">
    <div class="helm-side left">
      <HeroHud
        player={game.combat.player}
        level={game.progress.level}
        impact={game.impacts.player}
        bloom={game.bloom}
        name={game.profile?.name ?? 'You'}
        classId={game.progress.classId}
      />
    </div>

    <AbilityWheel
      abilityIds={game.kitIds}
      cast={game.combat.cast}
      queued={game.combat.queued}
      cooldowns={game.combat.cooldowns}
      gcd={game.combat.gcdRemaining}
      usable={game.usable}
      unlocked={game.progress.unlockedAbilities}
      mana={game.combat.player.mana}
      pressedKeys={game.pressed}
      denied={game.denied}
      {hub}
      respawnIn={game.combat.player.respawnIn}
      hue={region?.hue ?? 260}
      onactivate={(id) => game.use(id)}
      onhub={() => game.hubAction()}
    />

    <div class="helm-side right">
      <ClassResource resource={game.combat.resource} echo={game.combat.echo} classId={game.progress.classId} />
      {#if looting}
        <span class="helm-hint">or press <kbd>R</kbd> to loot all</span>
      {/if}
      {#if assault}
        <button class="turn-back" onclick={() => game.retreat()}>Break off the assault</button>
      {/if}
    </div>
  </div>

  <ArenaFx {game} />
  <FloatLayer floats={game.floats} />
</section>

<style>
  .arena {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
      radial-gradient(48% 30% at 50% 96%, oklch(0.8 0.11 195 / 0.07) 0%, transparent 70%),
      linear-gradient(180deg, oklch(0.5 0.06 calc(var(--zh) * 1) / 0.05) 0%, transparent 40%);
  }

  /* ---- chapter heading ---------------------------------------------- */

  .chapter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding-top: 2px;
  }

  .chapter-line {
    width: min(560px, 90%);
    justify-content: center;
    color: oklch(0.8 0.09 calc(var(--zh) * 1) / 0.8);
  }

  .zone-name {
    font-size: 19px;
    font-weight: 590;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
    white-space: nowrap;
    padding-inline: 4px;
  }

  .chapter.assault .zone-name {
    color: var(--ember);
  }

  .chapter.assault .chapter-line {
    color: oklch(0.75 0.13 60 / 0.7);
  }

  .chapter-sub {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .zone-epithet {
    font-style: italic;
  }

  .sep {
    opacity: 0.45;
  }

  .tier {
    font-size: 10px;
    font-weight: 640;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .chapter.assault .tier {
    color: var(--ember);
  }

  /* ---- the field ----------------------------------------------------- */

  .field {
    flex: 1;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .foes {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    width: 100%;
  }

  .rank {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 44px;
    width: 100%;
  }

  .rank.back {
    gap: 72px;
    margin-bottom: -32px;
    z-index: 0;
  }

  .rank.front {
    z-index: 1;
  }

  /* Every figure holds its own seat in the dark: a stable offset and a slow
     personal sway, so the pack reads as creatures standing, not tiles laid. */
  .spot {
    translate: 0 var(--bob, 0px);
    animation: spot-drift var(--drift-dur, 6s) var(--drift-delay, 0s) ease-in-out infinite alternate;
  }

  @keyframes spot-drift {
    from {
      transform: translateY(-3px);
    }
    to {
      transform: translateY(3px);
    }
  }

  /* ---- the lull ------------------------------------------------------ */

  .lull {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }

  .lull-word {
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    max-width: 520px;
  }

  .lull-word::first-letter {
    font-size: 1.5em;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
  }

  .lull-hint {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    opacity: 0.75;
  }

  .lull-hint kbd {
    font-family: inherit;
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 5px;
    border: 1px solid oklch(0.78 0.08 82 / 0.35);
    background: oklch(0.78 0.08 82 / 0.07);
  }

  /* ---- the helm ------------------------------------------------------ */

  .helm {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 18px;
    z-index: 1;
    padding-bottom: 4px;
  }

  .helm-side {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .helm-side.left {
    align-items: flex-end;
  }

  .helm-side.right {
    align-items: flex-start;
  }

  .helm-side.right :global(.resource) {
    justify-content: flex-start;
  }

  .helm-hint {
    font-size: 11px;
    color: var(--text-dim);
  }

  .helm-hint kbd {
    font-family: inherit;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid oklch(0.78 0.1 85 / 0.4);
    background: oklch(0.78 0.1 85 / 0.08);
  }

  .turn-back {
    background: none;
    border: 0;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0;
    text-align: left;
  }

  .turn-back:hover {
    color: var(--text);
  }

  @media (max-width: 1000px) {
    .rank {
      gap: 22px;
    }

    .rank.back {
      gap: 40px;
    }

    .helm {
      gap: 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spot {
      animation: none;
    }
  }
</style>
