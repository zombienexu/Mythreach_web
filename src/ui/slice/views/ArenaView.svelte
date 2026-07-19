<script lang="ts">
  import AbilityWheel, { type HubMode } from '../../components/AbilityWheel.svelte'
  import ArenaFx from '../../components/ArenaFx.svelte'
  import ClassResource from '../../components/ClassResource.svelte'
  import EnemyFigure from '../../components/EnemyFigure.svelte'
  import FloatLayer from '../../components/FloatLayer.svelte'
  import HeroHud from '../../components/HeroHud.svelte'
  import type { Game, Impact } from '../../game.svelte'
  import { FACTION } from '../content'
  import WeaveHeat from '../WeaveHeat.svelte'

  let { game }: { game: Game } = $props()

  const region = $derived(game.progress.regions.find((r) => r.current))
  const looting = $derived(game.combat.phase === 'looting')
  const shown = $derived(game.combat.enemies)

  const back = $derived(shown.filter((e) => e.row === 'back'))
  const front = $derived(shown.filter((e) => e.row !== 'back'))
  const solo = $derived(shown.length === 1)

  const IDLE_IMPACT: Impact = { n: 0, power: 1, crit: false }

  const hub: HubMode = $derived(
    !game.combat.player.alive ? 'fallen' : looting ? 'collect' : shown.length === 0 ? 'summon' : 'focus',
  )

  function seat(iid: number): string {
    const bob = ((iid * 37) % 5) * 5 - 10
    const dur = 5.6 + ((iid * 13) % 4) * 0.9
    const delay = -(((iid * 7) % 50) / 10)
    return `--bob: ${bob}px; --drift-dur: ${dur}s; --drift-delay: ${delay}s;`
  }
</script>

<section class="arena" aria-label="Arena" style:--zh={FACTION.hue}>
  {#if region}
    <header class="front-head">
      <span class="readout deploy">deployment · {region.tier} front · lv {region.minLevel}–{region.maxLevel}</span>
      <h2 class="front-name">{region.name}</h2>
      <span class="front-sub">{region.epithet}</span>
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
      <div class="lull">
        <span class="lull-word">{region?.intro ?? 'The line holds. For now.'}</span>
        <span class="lull-hint">press <kbd>Space</kbd> to engage — or the heart of the wheel</span>
      </div>
    {/if}
  </div>

  <div class="helm">
    <div class="helm-side left">
      <HeroHud
        player={game.combat.player}
        level={game.progress.level}
        impact={game.impacts.player}
        bloom={game.bloom}
        name={game.profile?.name ?? 'Conscript'}
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
      unlocked={game.taught}
      mana={game.combat.player.mana}
      pressedKeys={game.pressed}
      denied={game.denied}
      {hub}
      respawnIn={game.combat.player.respawnIn}
      hue={FACTION.hue}
      empowered={game.heatEmpowered}
      onactivate={(id) => game.use(id)}
      onhub={() => game.hubAction()}
    />

    <div class="helm-side right">
      {#if game.progress.classId === 'arcanist'}
        <WeaveHeat
          heat={game.combat.player.heat}
          focusReady={game.combat.player.focusReady}
          focusCd={game.combat.player.focusCd}
        />
      {:else}
        <ClassResource resource={game.combat.resource} echo={game.combat.echo} classId={game.progress.classId} />
      {/if}
      {#if looting}
        <span class="helm-hint">or press <kbd>R</kbd> to strip the field</span>
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
      radial-gradient(58% 34% at 50% 8%, oklch(0.72 0.19 45 / 0.12) 0%, transparent 70%),
      radial-gradient(48% 30% at 50% 96%, oklch(0.7 0.15 40 / 0.08) 0%, transparent 70%);
  }

  .front-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding-top: 2px;
    z-index: 1;
  }
  .deploy {
    color: var(--signal-dim);
  }
  .front-name {
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 580;
    color: var(--ember-glow);
  }
  .front-sub {
    font-size: 11.5px;
    font-style: italic;
    color: var(--text-dim);
  }

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
    color: var(--ember-glow);
  }
  .lull-hint {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    opacity: 0.75;
  }
  .lull-hint kbd,
  .helm-hint kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }

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
