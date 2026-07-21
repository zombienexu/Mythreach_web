<script lang="ts">
  import ActionBar, { type HubMode } from '../../components/ActionBar.svelte'
  import ArenaFx from '../../components/ArenaFx.svelte'
  import ClassResource from '../../components/ClassResource.svelte'
  import EnemyFigure from '../../components/EnemyFigure.svelte'
  import FloatLayer from '../../components/FloatLayer.svelte'
  import PlayerHud from '../../components/PlayerHud.svelte'
  import FieldScreen from '../../components/FieldScreen.svelte'
  import { ABILITIES } from '../../../engine'
  import { ticksToSeconds } from '../../format'
  import type { Game, Impact } from '../../game.svelte'
  import CampBoard from '../CampBoard.svelte'
  import { FACTION } from '../content'
  import WeaveHeat from '../WeaveHeat.svelte'

  let { game }: { game: Game } = $props()

  const region = $derived(game.progress.regions.find((r) => r.current))
  const inCamp = $derived(game.expedition.inCamp)
  const strike = $derived(game.combat.player.strike)
  const looting = $derived(game.combat.phase === 'looting')
  const shown = $derived(game.combat.enemies)

  const back = $derived(shown.filter((e) => e.row === 'back'))
  const front = $derived(shown.filter((e) => e.row !== 'back'))
  const solo = $derived(shown.length === 1)

  // The pack stands dormant — greyed, watching — until the player lands the
  // first strike and pulls aggro. Only meaningful mid-fight (never while looting).
  const dormant = $derived(game.combat.phase === 'combat' && !game.combat.engaged)

  const IDLE_IMPACT: Impact = { n: 0, power: 1, crit: false }

  // Before the First Weaving the calling has nothing to work with — the staff
  // is wood and there is no fire in the flue, so the seat sits sealed.
  const stokeSealed = $derived(
    game.progress.classId === 'arcanist' && !game.taught.includes('fireball'),
  )

  // The heart of the wheel says what Space does right now: sweep the spoils,
  // step into the circle (camp), walk on to the next scatter of sightings
  // (the field), or — mid-fight — throw the flue open: Stoke.
  const hub: HubMode = $derived(
    !game.combat.player.alive
      ? 'fallen'
      : looting
        ? 'collect'
        : shown.length > 0
          ? stokeSealed
            ? 'sealed'
            : 'stoke'
          : inCamp
            ? 'summon'
            : 'advance',
  )

  // The Arcanist's Heat, 0–1 — it deepens the orange glow washing the whole page.
  const heatGlow = $derived(
    game.progress.classId === 'arcanist' && game.combat.phase === 'combat'
      ? Math.max(0, Math.min(1, game.combat.player.heat / 10))
      : 0,
  )

  function seat(iid: number): string {
    const bob = ((iid * 37) % 5) * 5 - 10
    const dur = 5.6 + ((iid * 13) % 4) * 0.9
    const delay = -(((iid * 7) % 50) / 10)
    // A loose, deterministic scatter so a pack reads as strewn across the field
    // rather than dressed in a rigid line. Solo foes (and single formations)
    // sit dead-centre — no scatter — per the muster rules.
    const sx = solo ? 0 : ((iid * 53) % 11) * 8 - 40
    const sy = solo ? 0 : ((iid * 29) % 7) * 11 - 33
    return `--bob: ${bob}px; --drift-dur: ${dur}s; --drift-delay: ${delay}s; --sx: ${sx}px; --sy: ${sy}px;`
  }
</script>

<section class="arena" aria-label="Arena" style:--zh={FACTION.hue} style:--heat={heatGlow}>
  <!-- the page catches the fire: an orange wash that deepens with Heat -->
  <div class="heat-veil" aria-hidden="true"></div>

  {#if inCamp}
    <header class="front-head">
      <span class="readout deploy">recruitment camp · training grounds</span>
      <h2 class="front-name">The Kindle Yard</h2>
      <span class="front-sub">where the Legion finds out what you are</span>
    </header>
  {:else if region}
    <header class="front-head">
      <span class="readout deploy">deployment · {region.tier} front · lv {region.minLevel}–{region.maxLevel}</span>
      <h2 class="front-name">{region.name}</h2>
      <span class="front-sub">{region.epithet}</span>
    </header>
  {/if}

  <div class="field" class:solo class:dormant class:scatter={shown.length === 0 && !inCamp}>
    {#if shown.length > 0}
      {#if dormant}
        <div class="ambush" role="status">
          <span class="ambush-word">they haven't seen you yet</span>
          <span class="ambush-hint">
            <kbd>click</kbd> or <kbd>Tab</kbd> to pick your mark — <kbd>Q</kbd> swings first and free, then the field wakes
          </span>
        </div>
      {/if}
      <div class="foes" data-fx-row="enemies" role="group" aria-label="Enemies — click or Tab to target">
        {#if back.length > 0}
          <div class="rank back">
            {#each back as enemy (enemy.iid)}
              <div class="spot" style={seat(enemy.iid)}>
                <EnemyFigure
                  {enemy}
                  stance="back"
                  {dormant}
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
                {dormant}
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
    {:else if inCamp && game.campDuel}
      <CampBoard
        duel={game.campDuel}
        stepsDone={game.expedition.camp}
        onengage={() => game.engageCampDuel()}
      />
    {:else}
      <FieldScreen
        field={game.field}
        intro={region?.intro}
        onmark={(offerId, index) => game.markMob(offerId, index)}
        onnext={() => game.nextScreen()}
      />
    {/if}
  </div>

  <div class="helm">
    <span class="helm-rule" aria-hidden="true"></span>

    <div class="deck-row">
      <PlayerHud
        variant="deck"
        player={game.combat.player}
        level={game.progress.level}
        xp={game.progress.xp}
        xpToNext={game.progress.xpToNext}
        impact={game.impacts.player}
        bloom={game.bloom}
        name={game.profile?.name ?? 'Conscript'}
        classId={game.progress.classId}
      />

      <ActionBar
      strike={game.combat.player.strike}
      onstrike={() => game.strike()}
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
      stokeReady={game.combat.player.stokeReady}
      stokeCd={game.combat.player.stokeCd}
      stokeTicks={game.combat.player.stokeTicks}
      hue={FACTION.hue}
      empowered={game.heatEmpowered}
      onactivate={(id) => game.use(id)}
      onhub={() => game.hubAction()}
    >
      <!-- combat readouts span the full ability-bar width, directly above it:
           the cast bar rides on top only while weaving; the class resource
           (the mage's Heat) stays up the whole fight. -->
      {#snippet readouts()}
        {#if game.combat.phase === 'combat'}
          {#if game.combat.cast}
            {@const cast = game.combat.cast}
            <div class="cast" style:--tone="var(--tone-{cast.abilityId})">
              <span class="cast-name">{ABILITIES[cast.abilityId].name}</span>
              <span class="cast-track"><span class="cast-fill" style:width="{cast.progress * 100}%"></span></span>
              <span class="cast-time num">{ticksToSeconds(cast.remainingTicks)}s</span>
            </div>
          {:else if strike}
            <!-- the staff's basic attack: the wind-up bar, ticking out the
                 1.8 s arc of a blow you called for yourself. -->
            <div class="strike" class:idle={!strike.swinging}>
              <span class="strike-name">Staff</span>
              <span class="strike-track">
                <span class="strike-fill" style:width="{strike.swinging ? strike.progress * 100 : 0}%"></span>
              </span>
              <span class="strike-tag mono">
                {#if !strike.swinging}Q ▸ strike · {strike.dmgMin}–{strike.dmgMax}{:else}{strike.dmgMin}–{strike.dmgMax}{/if}
              </span>
            </div>
          {/if}
          {#if game.progress.classId === 'arcanist'}
            <!-- no gauge before the First Weaving: a staff-only recruit has no
                 fire to ride, and the empty bar would spoil the reveal -->
            {#if game.taught.includes('fireball')}
              <WeaveHeat heat={game.combat.player.heat} stoked={game.combat.player.stokeTicks > 0} />
            {/if}
          {:else}
            <ClassResource resource={game.combat.resource} echo={game.combat.echo} classId={game.progress.classId} />
          {/if}
        {/if}
      {/snippet}
      </ActionBar>
    </div>
    {#if looting}
      <span class="helm-hint">press <kbd>R</kbd> or the deck to strip the field</span>
    {/if}
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

  /* the light now reads the diagonal: heat gathers upper-right where the pack
     stands, a cooler wash pools lower-left toward the conscript's corner. */
  .arena::before {
    content: '';
    position: absolute;
    inset: -40px -40px -20px;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(46% 40% at 78% 22%, oklch(0.72 0.19 45 / 0.13) 0%, transparent 72%),
      radial-gradient(50% 44% at 14% 92%, oklch(0.62 0.1 250 / 0.09) 0%, transparent 72%);
  }

  /* Heat wash: the whole page glows hotter as the gauge fills. Opacity rides
     the --heat custom prop (0–1); at a full boil it breathes. Cheap: one
     compositor layer, opacity/filter only, no per-frame layout. */
  .heat-veil {
    position: absolute;
    inset: -40px -40px -20px;
    z-index: 0;
    pointer-events: none;
    opacity: var(--heat, 0);
    background:
      radial-gradient(85% 42% at 50% 104%, oklch(0.72 0.21 42 / 0.5) 0%, oklch(0.68 0.18 38 / 0.16) 42%, transparent 74%),
      radial-gradient(60% 34% at 82% 20%, oklch(0.74 0.2 46 / 0.24) 0%, transparent 70%),
      radial-gradient(120% 90% at 50% 120%, transparent 55%, oklch(0.66 0.18 40 / 0.16) 100%);
    transition: opacity 500ms var(--ease-out-expo);
    will-change: opacity;
  }
  /* past the empowered threshold the glow starts to breathe */
  .heat-veil::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(70% 40% at 50% 108%, oklch(0.8 0.22 45 / 0.4), transparent 70%);
    opacity: calc(max(0, var(--heat, 0) - 0.5) * 2);
    animation: heat-breathe 2.4s ease-in-out infinite;
  }
  @keyframes heat-breathe {
    50% {
      opacity: calc(max(0, var(--heat, 0) - 0.5) * 2 * 0.55);
    }
  }

  .front-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding-top: 2px;
    z-index: 1;
    /* the deployment title resolves out of the dark as the field is entered */
    animation: head-in 720ms 60ms var(--ease-out-expo) both;
  }
  @keyframes head-in {
    from {
      opacity: 0;
      transform: translateY(-12px);
      filter: blur(6px);
    }
    60% {
      filter: blur(0);
    }
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

  /* The pack musters at the centre of the field. A solo foe (or a single
     tight formation) stands dead-centre; a larger pack scatters loosely
     around that centre via per-figure --sx/--sy offsets. */
  .field {
    position: relative;
    flex: 1;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 6% 0;
    z-index: 1;
  }
  /* the scattered field wants the whole ground, not a centred island */
  .field.scatter {
    align-items: stretch;
    justify-content: stretch;
    padding: 4px 0 0;
  }
  .foes {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .rank {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 40px;
  }
  .rank.back {
    gap: 64px;
    margin-bottom: -30px;
    z-index: 0;
  }
  .rank.front {
    z-index: 1;
  }
  .spot {
    /* bob (idle offset) + scatter (--sx/--sy); the drift animation composes on
       top via the separate `transform` property. */
    translate: var(--sx, 0px) calc(var(--bob, 0px) + var(--sy, 0px));
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

  /* the muster banner: shown while the pack is dormant, floated above the
     field so it doesn't shove the scattered figures around */
  .ambush {
    position: absolute;
    top: 4px;
    left: 50%;
    translate: -50% 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
    pointer-events: none;
    animation: ambush-in 520ms var(--ease-out-expo) both;
  }
  @keyframes ambush-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }
  .ambush-word {
    font-family: var(--font-display);
    font-size: 13px;
    font-style: italic;
    letter-spacing: 0.06em;
    color: var(--ember-glow);
    text-shadow: 0 1px 10px oklch(0.05 0.02 280 / 0.9);
    animation: ambush-pulse 2.6s ease-in-out infinite;
  }
  @keyframes ambush-pulse {
    50% {
      opacity: 0.62;
    }
  }
  .ambush-hint {
    font-size: 10.5px;
    letter-spacing: 0.04em;
    color: var(--text-dim);
  }
  .ambush-hint kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }

  .helm-hint kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }

  .helm {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 1;
    padding: 14px 20px 12px;
    border-radius: 18px 18px 0 0;
    border: 1px solid oklch(0.78 0.08 82 / 0.14);
    border-bottom: none;
    background:
      radial-gradient(70% 130% at 50% 100%, oklch(0.72 0.19 45 / 0.05), transparent 70%),
      linear-gradient(180deg, oklch(0.13 0.03 300 / 0.5), oklch(0.1 0.035 305 / 0.82));
    backdrop-filter: blur(var(--glass-blur, 14px));
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.05),
      0 -18px 44px -30px oklch(0.03 0.02 280 / 0.9);
    /* the war-deck rises up from the foot of the screen as combat is joined */
    animation: helm-rise 640ms 180ms var(--ease-out-expo) both;
  }
  /* the portrait takes its combat station to the left of the abilities */
  .deck-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 22px;
  }
  @keyframes helm-rise {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
  }
  /* a hairline of gilt light along the top of the deck */
  .helm-rule {
    position: absolute;
    top: -1px;
    left: 20%;
    right: 20%;
    height: 1px;
    background: linear-gradient(90deg, transparent, oklch(0.8 0.1 85 / 0.5), transparent);
  }

  /* the cast bar spans the full ability-bar width (its .bar-status parent is
     stretched), rides on top, and only exists while weaving. */
  .cast {
    --tone: var(--ether);
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 6px 14px;
    border-radius: 10px;
    background: linear-gradient(180deg, oklch(0.17 0.03 300 / 0.6), oklch(0.11 0.035 305 / 0.7));
    border: 1px solid color-mix(in oklch, var(--tone) 42%, oklch(0.85 0.03 260 / 0.16));
    box-shadow: 0 0 18px -8px var(--tone);
    animation: cast-in 220ms var(--ease-out-expo);
  }
  @keyframes cast-in {
    from {
      opacity: 0;
      transform: translateY(6px) scaleX(0.96);
    }
  }
  .cast-name {
    font-family: var(--font-display);
    font-size: 12.5px;
    color: var(--tone);
    white-space: nowrap;
    text-shadow: 0 0 12px color-mix(in oklch, var(--tone) 50%, transparent);
  }
  .cast-track {
    position: relative;
    flex: 1;
    height: 6px;
    border-radius: 99px;
    background: oklch(0.85 0.03 260 / 0.12);
    overflow: hidden;
  }
  .cast-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: var(--tone);
    box-shadow: 0 0 9px -1px var(--tone);
    transition: width 90ms linear;
  }
  .cast-time {
    font-size: 11px;
    color: var(--text-dim);
    min-width: 30px;
    text-align: right;
  }

  .helm-hint {
    font-size: 11px;
    color: var(--text-dim);
  }

  /* the staff's wind-up: same station as the cast bar, humbler dress —
     wood-and-gilt, ticking out the arc of the blow you called for */
  .strike {
    --wood: oklch(0.78 0.09 85);
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 6px 14px;
    border-radius: 10px;
    background: linear-gradient(180deg, oklch(0.17 0.03 300 / 0.6), oklch(0.11 0.035 305 / 0.7));
    border: 1px solid color-mix(in oklch, var(--wood) 32%, oklch(0.85 0.03 260 / 0.16));
  }
  /* at rest the bar is only a prompt: the staff waits on your hand */
  .strike.idle {
    opacity: 0.72;
  }
  .strike-name {
    font-family: var(--font-display);
    font-size: 12.5px;
    color: var(--wood);
    white-space: nowrap;
  }
  .strike-track {
    position: relative;
    flex: 1;
    min-width: 140px;
    height: 6px;
    border-radius: 99px;
    background: oklch(0.85 0.03 260 / 0.12);
    overflow: hidden;
  }
  .strike-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: var(--wood);
    box-shadow: 0 0 9px -1px var(--wood);
    transition: width 60ms linear;
  }
  .strike-tag {
    font-size: 10.5px;
    color: var(--text-dim);
    min-width: 74px;
    text-align: right;
  }

  @media (max-width: 1000px) {
    .rank {
      gap: 22px;
    }
    .rank.back {
      gap: 40px;
    }
    .helm {
      padding: 12px 14px 10px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spot {
      animation: none;
    }
  }
</style>
