<script lang="ts">
  import { onMount } from 'svelte'
  import { ABILITIES } from '../../engine'
  import AbilityIcon from '../components/icons/AbilityIcon.svelte'
  import Background from '../components/Background.svelte'
  import CritFlash from '../components/CritFlash.svelte'
  import LevelUpBanner from '../components/LevelUpBanner.svelte'
  import PlayerHud from '../components/PlayerHud.svelte'
  import Toast from '../components/Toast.svelte'
  import Vignette from '../components/Vignette.svelte'
  import type { Game, View } from '../game.svelte'
  import { loadSettings } from '../profile'
  import { GRADUATION_SEND_OFF } from './camp'
  import { FACTION, FIRST_ORDER, SERGEANT } from './content'
  import ArenaView from './views/ArenaView.svelte'
  import CodexView from './views/CodexView.svelte'
  import DossierView from './views/DossierView.svelte'
  import MapView from './views/MapView.svelte'

  let { game, onexit }: { game: Game; onexit: () => void } = $props()

  let shell: HTMLDivElement | undefined = $state()

  onMount(() => {
    game.start()
    if (shell && loadSettings(localStorage).shake) game.fx.attachShake(shell)
    return () => game.stop()
  })

  const ex = $derived(game.expedition)
  const NAV: { id: View; label: string; hint: string }[] = [
    { id: 'arena', label: 'Arena', hint: 'the front' },
    { id: 'map', label: 'Map', hint: 'fronts · difficulty' },
    { id: 'dossier', label: 'Dossier', hint: 'standing · loadout · charges' },
    { id: 'codex', label: 'Codex', hint: 'research · recovery' },
  ]

  // teaching ceremony — the Fireball teach is the First Weaving: the camp's
  // big moment, dressed grander than any later rite.
  const teaching = $derived(ex.justTaught)
  const teachNames = $derived((teaching ?? []).map((id) => ABILITIES[id]?.name ?? id))
  const firstWeaving = $derived(teaching?.includes('fireball') ?? false)
  // graduation — Vale's send-off and the classic first order
  const boarOrder = $derived(game.progress.quests.find((q) => q.id === FIRST_ORDER))
</script>

<Background hue={FACTION.hue} />

<div class="uplink" bind:this={shell}>
  <!-- the console frame: cold instrumentation around a warm world -->
  <div class="scan" aria-hidden="true"></div>

  <nav class="rail ticked" aria-label="Uplink">
    <div class="brand">
      <span class="carrier"></span>
      <span class="readout">uplink</span>
    </div>
    {#each NAV as n (n.id)}
      {@const locked = n.id === 'map' && ex.inCamp}
      <button
        class="dest"
        class:on={game.view === n.id}
        class:locked
        disabled={locked}
        onclick={() => game.setView(n.id)}
        aria-current={game.view === n.id}
      >
        <span class="dest-label">{n.label}</span>
        <span class="dest-hint">{locked ? 'opens at graduation' : n.hint}</span>
        {#if n.id === 'codex' && ex.pendingTransmits > 0}
          <span class="badge mono">{ex.pendingTransmits}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <main class="main" class:combat={game.view === 'arena'}>
    <header class="telemetry ticked console-panel">
      <div class="tele world">
        <span class="readout">projected · {game.progress.level > 0 ? 'live' : ''}</span>
        <span class="world-name">{FACTION.name}</span>
      </div>

      <div class="tele standing" title="The Legion's trust in you">
        {#key ex.standingPulse}
          <span class="readout pulse">standing · {ex.tier.name}</span>
        {/key}
        <div class="grace">
          <div class="meter">
            <span class="fill grace-fill" style:width="{Math.round(ex.graceProgress * 100)}%"></span>
          </div>
          <span class="mono grace-num">
            {ex.standing}{#if ex.nextTier}<span class="dim"> / {ex.nextTier.at}</span>{/if}
          </span>
        </div>
      </div>

      <div class="tele findings" title="Codex findings transmitted home">
        <span class="readout">findings</span>
        <span class="mono big">{ex.findings}</span>
      </div>

      <div class="tele gold" title="Legion coin">
        <span class="readout">coin</span>
        <span class="mono big ember">{game.progress.gold}</span>
      </div>

      <div class="tele recovery" title="World Recovery — the Codex coming home">
        <span class="readout">recovery</span>
        <div class="rec-line">
          <div class="meter"><span class="fill rec" style:width="{Math.round(ex.recovery * 100)}%"></span></div>
          <span class="mono rec-num">{Math.round(ex.recovery * 100)}%</span>
        </div>
      </div>

      <div class="tele ctrls">
        <button class="tog" class:on={!game.muted} onclick={() => game.toggleMute()} title="Audio">
          <span class="readout">{game.muted ? 'muted' : 'audio'}</span>
        </button>
        <button class="tog exit" onclick={onexit} title="Drop uplink — return to the Institute">
          <span class="readout">disconnect</span>
        </button>
      </div>
    </header>

    {#key game.view}
      <div class="view">
        {#if game.view === 'arena'}
          <ArenaView {game} />
        {:else if game.view === 'map'}
          <MapView {game} />
        {:else if game.view === 'dossier'}
          <DossierView {game} />
        {:else}
          <CodexView {game} />
        {/if}
      </div>
    {/key}
  </main>
</div>

<!-- The player's HUD lives in the bottom-left corner on every tab — except the
     Arena, where it fades out and the deck's own portrait takes the field. -->
<PlayerHud
  variant="corner"
  faded={game.view === 'arena'}
  player={game.combat.player}
  level={game.progress.level}
  xp={game.progress.xp}
  xpToNext={game.progress.xpToNext}
  impact={game.impacts.player}
  bloom={game.bloom}
  name={game.profile?.name ?? 'Conscript'}
  classId={game.progress.classId}
/>

<Vignette combat={game.combat} />

{#if game.critFlash.n > 0}
  {#key game.critFlash.n}
    <CritFlash power={game.critFlash.power} side={game.critFlash.side} />
  {/key}
{/if}

{#if game.banner}
  <LevelUpBanner level={game.banner.level} unlocked={[]} />
{/if}

{#if game.toast}
  {#key game.toast.id}
    <Toast title={game.toast.title} body={game.toast.body} />
  {/key}
{/if}

<!-- Teaching ceremony: the Legion trusts you with new War-Weaving. The very
     first — Fireball, the First Weaving — is the camp's big moment and wears
     a grander dress than every rite after it. -->
{#if teaching && teaching.length > 0}
  <button
    class="ceremony"
    class:weaving={firstWeaving}
    onclick={() => ex.clearTeaching()}
    aria-label="Acknowledge"
  >
    <div class="rite console-panel ticked" class:grand={firstWeaving}>
      {#if firstWeaving}
        <span class="readout ember">the first weaving</span>
        <h2 class="rec-title">Fireball</h2>
      {:else}
        <span class="readout">the ember legion teaches you · {ex.tier.name}</span>
      {/if}
      <div class="glyphs">
        {#each teaching as id (id)}
          <div class="glyph">
            <span class="ic" class:blaze={firstWeaving} style:--tone="var(--tone-{id})"><AbilityIcon {id} /></span>
            {#if !firstWeaving}<span class="gname">{ABILITIES[id]?.name ?? id}</span>{/if}
          </div>
        {/each}
      </div>
      {#if firstWeaving}
        <p class="rite-blurb">
          Vale takes your staff hand and turns it palm-up. “You proved the hands. Now feel what they
          were for.” Something old and patient kindles behind your knuckles — the first spark of a
          lost art, alive, and yours to feed.
        </p>
        <p class="rite-learn mono">recorded to the codex · war-weaving, first working</p>
      {:else}
        <p class="rite-blurb">{ex.tier.blurb}</p>
        <p class="rite-learn mono">
          learned: {teachNames.join(' · ')}
        </p>
      {/if}
      <span class="rite-hint readout">click to continue</span>
    </div>
  </button>
{/if}

<!-- Graduation: the yard is done with you — the classic first order -->
{#if ex.justGraduated}
  <button class="ceremony" onclick={() => ex.clearGraduated()} aria-label="Acknowledge orders">
    <div class="rite console-panel ticked">
      <span class="readout">the kindle yard · graduation</span>
      <h2 class="brief-name">{SERGEANT}</h2>
      <p class="rite-blurb">{GRADUATION_SEND_OFF}</p>
      {#if boarOrder}
        <div class="order-card">
          <span class="order-title">{boarOrder.name}</span>
          <span class="order-obj mono">
            Fell {boarOrder.objective.targetName} · {boarOrder.objective.count}
          </span>
        </div>
      {/if}
      <p class="rite-learn mono">the map and the field are open — the world is yours to hunt</p>
      <span class="rite-hint readout">click to take the field</span>
    </div>
  </button>
{/if}

<!-- The art recovered: the whole Codex is home -->
{#if ex.justRecovered}
  <button class="ceremony recovered" onclick={() => ex.clearRecovered()} aria-label="Acknowledge">
    <div class="rite console-panel ticked">
      <span class="readout ember">transmission complete</span>
      <h2 class="rec-title">War-Weaving Recovered</h2>
      <p class="rite-blurb">
        The full Codex is home. The Institute logs the first art of a lost world — Tier I. The
        Recovery advances.
      </p>
      <span class="rite-hint readout">click to continue</span>
    </div>
  </button>
{/if}

<style>
  .uplink {
    position: relative;
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr);
    min-height: 100dvh;
    isolation: isolate;
  }

  .scan {
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, oklch(0.84 0.12 205 / 0.025) 50%, transparent);
    height: 30%;
    animation: uplink-scan 7s linear infinite;
    mix-blend-mode: screen;
  }

  /* ── the rail ─────────────────────────────────────────────── */
  .rail {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 12px;
    border-right: 1px solid var(--console-edge);
    border-radius: 0;
    background: linear-gradient(180deg, oklch(0.5 0.03 235 / 0.06), oklch(0.5 0.03 250 / 0.02));
    backdrop-filter: blur(var(--glass-blur));
    z-index: 2;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 16px;
  }
  .carrier {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--signal);
    box-shadow: 0 0 10px var(--signal);
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.4;
    }
  }

  .dest {
    position: relative;
    text-align: left;
    padding: 11px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition:
      background var(--dur-fast),
      border-color var(--dur-fast);
  }
  .dest:hover {
    background: var(--signal-faint);
  }
  .dest.on {
    background: var(--signal-faint);
    border-color: var(--console-edge);
    box-shadow: inset 2px 0 0 var(--signal);
  }
  .dest.locked {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .dest-label {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--text-dim);
  }
  .dest.on .dest-label {
    color: var(--text);
  }
  .dest-hint {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--signal-dim);
    opacity: 0.8;
  }
  .badge {
    position: absolute;
    top: 9px;
    right: 10px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--ember-war);
    color: oklch(0.15 0.02 40);
    font-size: 10px;
    display: grid;
    place-items: center;
    box-shadow: 0 0 10px oklch(0.72 0.19 45 / 0.6);
  }

  .recovery {
    min-width: 128px;
  }
  .rec-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .recovery .meter {
    width: 96px;
  }
  .fill.rec {
    background: linear-gradient(90deg, var(--signal-dim), var(--signal));
  }
  .rec-num {
    font-size: 11px;
    color: var(--signal);
  }

  /* ── main + telemetry ─────────────────────────────────────── */
  .main {
    width: min(1080px, 100%);
    margin-inline: auto;
    padding: 16px 26px 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 100dvh;
  }
  /* The combat screen is full-bleed: the battlefield and its backdrop fill the
     window and track it on resize, so the corner portrait, the diagonal pack,
     and the full-viewport effects all stay coherent as the window changes. */
  .main.combat {
    width: 100%;
    max-width: none;
    padding-inline: clamp(16px, 3vw, 44px);
  }

  .telemetry {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 10px 18px;
    flex-wrap: wrap;
  }
  .tele {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .world-name {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--ember-glow);
    letter-spacing: 0.01em;
  }
  .standing {
    min-width: 190px;
  }
  .pulse {
    animation: pop var(--dur) var(--ease-spring);
  }
  @keyframes pop {
    from {
      color: var(--signal);
      transform: translateY(-1px);
    }
  }
  .grace {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .grace .meter {
    width: 120px;
  }
  .fill.grace-fill {
    background: linear-gradient(90deg, var(--ember-war), var(--ember-glow));
    box-shadow: 0 0 8px oklch(0.72 0.19 45 / 0.5);
  }
  .grace-num {
    font-size: 11px;
    color: var(--text);
  }
  .dim {
    color: var(--text-dim);
    opacity: 0.6;
  }
  .big {
    font-size: 17px;
    color: var(--text);
  }
  .ember {
    color: var(--ember);
  }
  .findings .big {
    color: var(--signal);
  }

  .ctrls {
    flex-direction: row;
    gap: 6px;
    margin-left: auto;
    align-items: center;
  }
  .tog {
    border: 1px solid var(--console-line);
    background: none;
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    cursor: pointer;
    transition:
      background var(--dur-fast),
      border-color var(--dur-fast);
  }
  .tog:hover {
    border-color: var(--signal);
  }
  .tog.on {
    background: var(--signal-faint);
    border-color: var(--signal);
  }
  .tog.on .readout {
    color: var(--signal);
  }
  .tog.exit:hover {
    border-color: var(--wound);
  }
  .tog.exit:hover .readout {
    color: var(--wound);
  }

  .view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    animation: view-in var(--dur-slow) var(--ease-out-expo);
  }
  @keyframes view-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  /* ── ceremonies ───────────────────────────────────────────── */
  .ceremony {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    border: 0;
    cursor: pointer;
    background: radial-gradient(60% 60% at 50% 45%, oklch(0.1 0.03 40 / 0.72), oklch(0.06 0.02 40 / 0.86));
    animation: fade var(--dur) ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  .rite {
    width: min(460px, 92%);
    padding: 26px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    border-color: oklch(0.72 0.19 45 / 0.4);
    box-shadow: 0 0 60px oklch(0.72 0.19 45 / 0.2);
    animation: rite-in var(--dur-epic) var(--ease-out-expo);
  }
  @keyframes rite-in {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(12px);
      filter: brightness(2);
    }
  }
  .glyphs {
    display: flex;
    gap: 20px;
    padding: 6px 0;
  }
  /* the First Weaving: the room burns warmer, the sigil bigger */
  .ceremony.weaving {
    background: radial-gradient(60% 60% at 50% 45%, oklch(0.14 0.06 40 / 0.8), oklch(0.05 0.02 40 / 0.92));
  }
  .rite.grand {
    border-color: oklch(0.72 0.19 45 / 0.7);
    box-shadow: 0 0 110px oklch(0.72 0.19 45 / 0.4);
  }
  .ic.blaze {
    width: 88px;
    height: 88px;
    box-shadow: 0 0 60px oklch(0.72 0.19 45 / 0.65);
    animation: blaze-in 1.1s var(--ease-out-expo);
  }
  @keyframes blaze-in {
    from {
      transform: scale(0.2) rotate(-40deg);
      opacity: 0;
      filter: brightness(3);
    }
  }
  .glyph {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .ic {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid oklch(0.72 0.19 45 / 0.5);
    color: var(--tone);
    background: radial-gradient(circle, oklch(0.72 0.19 45 / 0.18), transparent 70%);
    box-shadow: 0 0 24px oklch(0.72 0.19 45 / 0.35);
    animation: glow-in var(--dur-epic) var(--ease-out-expo);
  }
  @keyframes glow-in {
    from {
      transform: scale(0.4) rotate(-30deg);
      opacity: 0;
    }
  }
  .gname {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--ember-glow);
  }
  .rite-blurb {
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-dim);
    max-width: 46ch;
    font-style: italic;
  }
  .rite-learn {
    font-size: 11px;
    color: var(--signal);
    letter-spacing: 0.06em;
  }
  .rite-hint {
    opacity: 0.5;
    margin-top: 4px;
  }
  .rec-title {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 560;
    color: var(--ember-glow);
    text-shadow: 0 0 30px oklch(0.72 0.19 45 / 0.4);
  }

  .brief-name {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 560;
    color: var(--ember-glow);
  }
  .order-card {
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--signal-faint);
    background: var(--signal-faint);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .order-title {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--text);
  }
  .order-obj {
    font-size: 11px;
    color: var(--signal);
  }

  @media (max-width: 1000px) {
    .uplink {
      grid-template-columns: 140px minmax(0, 1fr);
    }
    .main {
      padding: 14px 16px 18px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scan,
    .carrier,
    .view,
    .rite,
    .ic,
    .ic.blaze {
      animation: none;
    }
  }
</style>
