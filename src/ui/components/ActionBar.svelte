<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    ABILITIES,
    GCD_TICKS,
    type AbilityId,
    type CastSnapshot,
    type School,
    type StrikeSnapshot,
  } from '../../engine'
  import { cooldownLabel, ticksToSeconds } from '../format'
  import AbilityIcon from './icons/AbilityIcon.svelte'

  /** What the hub offers right now. `focus` is combat: read the foe (Space).
   *  `advance` is the field lull: walk on to the next screen of sightings. */
  export type HubMode = 'summon' | 'advance' | 'focus' | 'collect' | 'fallen'

  let {
    readouts,
    strike = null,
    onstrike,
    abilityIds,
    cast,
    queued,
    cooldowns,
    gcd,
    usable,
    unlocked,
    mana,
    pressedKeys,
    denied,
    hub,
    respawnIn = 0,
    focusReady = false,
    focusCd = 0,
    hue = 260,
    empowered = null,
    onactivate,
    onhub,
  }: {
    /** The staff's wind-up, or null when there is nothing to swing at. The
     *  basic attack is not automatic: it holds the first seat, worn on Q. */
    strike?: StrikeSnapshot | null
    onstrike?: () => void
    /** The active class's kit, in kit order — socket i wears key i+1. */
    abilityIds: readonly AbilityId[]
    cast: CastSnapshot | null
    queued: AbilityId | null
    cooldowns: Record<AbilityId, number>
    gcd: number
    usable: Record<AbilityId, boolean>
    unlocked: AbilityId[]
    mana: number
    pressedKeys: ReadonlySet<string>
    denied: Record<AbilityId, number>
    hub: HubMode
    respawnIn?: number
    /** Universal Focus readiness — the hub glows when a tell can be answered. */
    focusReady?: boolean
    focusCd?: number
    hue?: number
    /** An ability the moment has empowered: its tile burns and beckons. */
    empowered?: AbilityId | null
    onactivate?: (id: AbilityId) => void
    onhub?: () => void
    /** Combat readouts (cast bar, class resource) rendered full-width directly
     *  above the tile row, so they span exactly the ability bar's length. */
    readouts?: Snippet
  } = $props()

  const gcdFraction = $derived(Math.max(0, Math.min(1, gcd / GCD_TICKS)))

  /** School → a human label and the accent hue used in the tooltip badge. */
  const SCHOOL: Record<School, { label: string; hue: number }> = {
    fire: { label: 'Fire', hue: 40 },
    arcane: { label: 'Arcane', hue: 300 },
    holy: { label: 'Holy', hue: 90 },
    shadow: { label: 'Shadow', hue: 300 },
    temporal: { label: 'Temporal', hue: 240 },
    fortune: { label: 'Fortune', hue: 85 },
    nature: { label: 'Nature', hue: 140 },
    rift: { label: 'Rift', hue: 320 },
  }

  /** One-shot choreography per tile, armed from data changes. */
  function choreo(node: HTMLElement, state: { pressed: boolean; denied: number; cooldown: number }) {
    let last = { ...state }
    const pulse = (cls: string) => {
      node.classList.remove(cls)
      void node.offsetWidth
      node.classList.add(cls)
    }
    return {
      update(next: { pressed: boolean; denied: number; cooldown: number }) {
        if (next.pressed && !last.pressed) pulse('struck')
        if (next.denied > last.denied) pulse('refused')
        if (next.cooldown === 0 && last.cooldown > 0) pulse('ready')
        last = { ...next }
      },
    }
  }

  /** The dynamic one-line status shown at the foot of a tile's tooltip. */
  function status(id: AbilityId): { text: string; tone: 'ready' | 'cd' | 'oom' | 'hot' | 'cast' } {
    const def = ABILITIES[id]
    if (cast?.abilityId === id) return { text: 'Weaving…', tone: 'cast' }
    if (id === empowered) return { text: 'Empowered — unleash now', tone: 'hot' }
    if (cooldowns[id] > 0) return { text: `Cooling — ${ticksToSeconds(cooldowns[id])}s`, tone: 'cd' }
    if (mana < def.manaCost) return { text: 'Not enough mana', tone: 'oom' }
    if (!usable[id]) return { text: 'No valid target', tone: 'cd' }
    return { text: 'Ready', tone: 'ready' }
  }

  const hubLabel = $derived(
    hub === 'summon'
      ? 'Engage'
      : hub === 'advance'
        ? 'Walk on'
        : hub === 'collect'
          ? 'Loot all'
          : hub === 'fallen'
            ? 'Fallen'
            : 'Focus',
  )
  const hubDisabled = $derived(hub === 'fallen')
</script>

<div class="bar" style:--zh={hue} role="toolbar" aria-label="Abilities">
  {#if readouts}
    <div class="bar-status">{@render readouts()}</div>
  {/if}

  <div class="row">
    <!-- the staff: the one attack that was never given to you by the Legion,
         and the only one that answers to a key of its own. Nothing swings on
         its own clock — this seat is the whole basic attack. -->
    <div class="cell staff-cell" style:--i={0}>
      <button
        class="tile staff"
        class:unusable={!strike?.ready}
        class:swinging={strike?.swinging}
        class:armed={strike?.sharpenReady}
        class:pressed={pressedKeys.has('q')}
        onclick={() => onstrike?.()}
        aria-label="Staff strike (key Q)"
        aria-keyshortcuts="Q"
        aria-disabled={!strike?.ready}
      >
        <span class="key num">Q</span>
        <span class="face">
          <span class="glow" aria-hidden="true"></span>
          <span class="icon staff-glyph">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M5.5 19.5 L17 8" stroke-linecap="round" />
              <path d="M14.6 5.4 a3.4 3.4 0 1 1 4.8 4.8 a3.4 3.4 0 1 1 -4.8 -4.8 Z" />
              <path d="M17 7.8 l0.1 0.1" stroke-linecap="round" />
            </svg>
          </span>
        </span>
        {#if strike?.swinging}
          <span class="windup" style:height="{strike.progress * 100}%"></span>
        {/if}
      </button>
      <span class="name">Staff</span>

      <div class="tip" role="tooltip" style:--sh="82">
        <div class="tip-head">
          <span class="tip-name">Staff</span>
          <span class="tip-key num">Q</span>
        </div>
        <div class="tip-tags"><span class="tag school">Wood &amp; gilt</span></div>
        <div class="tip-stats">
          <span class="stat"><span class="stat-k">Damage</span><span class="stat-v num">{strike ? `${strike.dmgMin}–${strike.dmgMax}` : '—'}</span></span>
          <span class="stat"><span class="stat-k">Wind-up</span><span class="stat-v num">1.8s</span></span>
        </div>
        <p class="tip-desc">
          The blow you were issued on day one. It swings when you call it and never before —
          press <b>Space</b> late in the wind-up to Sharpen the landing blow.
        </p>
        <div class="tip-foot {strike?.swinging ? 'cast' : strike?.ready ? 'ready' : 'cd'}">
          <span class="foot-dot"></span>
          {strike?.sharpenReady ? 'Sharpened — let it land' : strike?.swinging ? 'Winding up…' : strike?.ready ? 'Ready' : 'Nothing to swing at'}
        </div>
      </div>
    </div>

    {#each abilityIds as id, i (id)}
      {@const def = ABILITIES[id]}
      {@const known = unlocked.includes(id)}
      {@const cd = cooldowns[id]}
      {@const onCd = cd > 0}
      {@const oom = mana < def.manaCost}
      {@const st = known ? status(id) : null}
      <div class="cell" style:--i={i + 1}>
        {#if known}
          <button
            class="tile"
            class:unusable={!usable[id]}
            class:oom
            class:casting={cast?.abilityId === id}
            class:queued={queued === id}
            class:empowered={id === empowered}
            class:pressed={pressedKeys.has(def.key)}
            class:cooling={onCd}
            style:--tone="var(--tone-{id})"
            use:choreo={{ pressed: pressedKeys.has(def.key), denied: denied[id], cooldown: cd }}
            onclick={() => onactivate?.(id)}
            aria-label="{def.name} (key {def.key})"
            aria-keyshortcuts={def.key}
            aria-disabled={!usable[id]}
          >
            <span class="key num">{def.key}</span>
            <span class="cost num" class:short={oom}>{def.manaCost}</span>

            <span class="face">
              <span class="glow" aria-hidden="true"></span>
              <span class="icon"><AbilityIcon {id} /></span>
              <span class="wave" aria-hidden="true"></span>
            </span>

            {#if def.castTicks > 0 && cast?.abilityId === id}
              <span class="castwash" style:height="{cast.progress * 100}%"></span>
            {/if}

            {#if onCd}
              <span class="sweep" style:--p={def.cooldownTicks > 0 ? cd / def.cooldownTicks : 0}></span>
              <span class="cd num">{cooldownLabel(cd)}</span>
            {:else if gcd > 0 && cast?.abilityId !== id}
              <span class="sweep gcd" style:--p={gcdFraction}></span>
            {/if}

            {#if id === empowered}
              <span class="spark" aria-hidden="true">!</span>
            {/if}
          </button>

          <span class="name">{def.name}</span>

          <!-- the rich tooltip: rises above the tile on hover / focus -->
          <div class="tip" role="tooltip" style:--sh={SCHOOL[def.school].hue}>
            <div class="tip-head">
              <span class="tip-name">{def.name}</span>
              <span class="tip-key num">{def.key}</span>
            </div>
            <div class="tip-tags">
              <span class="tag school">{SCHOOL[def.school].label}</span>
              {#if def.offGcd}<span class="tag">Instant · off-turn</span>{/if}
            </div>
            <div class="tip-stats">
              <span class="stat"><span class="stat-k">Mana</span><span class="stat-v num" class:short={oom}>{def.manaCost}</span></span>
              <span class="stat"><span class="stat-k">Cast</span><span class="stat-v num">{def.castTicks > 0 ? `${ticksToSeconds(def.castTicks)}s` : 'Instant'}</span></span>
              <span class="stat"><span class="stat-k">Cooldown</span><span class="stat-v num">{def.cooldownTicks > 0 ? `${ticksToSeconds(def.cooldownTicks)}s` : '—'}</span></span>
            </div>
            <p class="tip-desc">{def.description}</p>
            {#if st}
              <div class="tip-foot {st.tone}"><span class="foot-dot"></span>{st.text}</div>
            {/if}
          </div>
        {:else}
          <span class="tile sealed" aria-hidden="false" aria-label="{def.name} — sealed until the Legion teaches it">
            <span class="key num">{def.key}</span>
            <svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" />
            </svg>
            <div class="tip sealed-tip" role="tooltip">
              <div class="tip-head"><span class="tip-name">{def.name}</span></div>
              <p class="tip-desc">Sealed — the Legion teaches this at Standing {def.unlockLevel}.</p>
            </div>
          </span>
          <span class="name dim">{def.name}</span>
        {/if}
      </div>
    {/each}

    <!-- the hub: the one action Space always answers -->
    <div class="cell hub-cell" style:--i={abilityIds.length + 1}>
      <button
        class="hub {hub}"
        class:ready={hub === 'focus' && focusReady}
        disabled={hubDisabled}
        onclick={() => onhub?.()}
        aria-label={hubLabel}
        title={hub === 'summon' ? 'Engage the marked sighting (Space)' : hub === 'advance' ? 'Walk on — turn the field over for a fresh screen of sightings (Space)' : hub === 'collect' ? 'Collect every spoil (Space or R)' : hub === 'focus' ? 'Focus — read the foe and crack it open (Space)' : 'Fallen — waiting to revive'}
      >
        {#if hub === 'summon'}
          <svg class="hub-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 L14.3 9.7 L21.4 12 L14.3 14.3 L12 21.4 L9.7 14.3 L2.6 12 L9.7 9.7 Z" fill="currentColor" /></svg>
          <span class="hub-word">Engage</span>
          <span class="hub-key num">Space</span>
        {:else if hub === 'advance'}
          <svg class="hub-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12 h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
            <path d="M13.5 7.5 L19 12 L13.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
          <span class="hub-word">Walk on</span>
          <span class="hub-key num">Space</span>
        {:else if hub === 'collect'}
          <svg class="hub-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z" fill="currentColor" /></svg>
          <span class="hub-word">Loot all</span>
          <span class="hub-key num">R</span>
        {:else if hub === 'fallen'}
          <span class="hub-word dim">Fallen</span>
          <span class="hub-key num">{ticksToSeconds(respawnIn)}s</span>
        {:else}
          <svg class="hub-arc" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="arc-track" cx="50" cy="50" r="44" pathLength="100" />
            {#if !focusReady && focusCd > 0}
              <circle class="arc-cd" cx="50" cy="50" r="44" pathLength="100" style:stroke-dasharray="{(1 - Math.min(1, focusCd / 60)) * 100} 100" />
            {/if}
          </svg>
          <svg class="hub-glyph eye" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12 C5 7 9 5 12 5 C15 5 19 7 21.5 12 C19 17 15 19 12 19 C9 19 5 17 2.5 12 Z" fill="none" stroke="currentColor" stroke-width="1.8" />
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
          </svg>
          <span class="hub-word">{focusReady ? 'Focus' : 'Focus'}</span>
          <span class="hub-key num">Space</span>
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .bar {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: none;
  }

  /* combat readouts span the whole bar — exactly the tile row's width, since
     the row is what sizes the bar. */
  .bar-status {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 7px;
    margin-bottom: 4px;
  }

  /* ---- the tile row ------------------------------------------------- */
  .row {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    /* entrance: each tile rises and settles in turn, cresting the deck as it
       sweeps up from the bottom of the screen. One-shot; auto-stilled under
       reduced motion by the global data-motion rule. */
    animation: tile-pop 520ms calc(var(--i, 0) * 45ms + 360ms) var(--ease-out-expo) both;
  }
  @keyframes tile-pop {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.9);
    }
  }

  .tile {
    --tone: var(--ether);
    --tile: clamp(64px, 5.8vw, 82px);
    position: relative;
    width: var(--tile);
    height: var(--tile);
    border-radius: 16px;
    border: 1px solid oklch(0.85 0.03 260 / 0.18);
    background:
      radial-gradient(120% 90% at 50% 0%, oklch(0.82 0.02 260 / 0.09), transparent 62%),
      linear-gradient(180deg, oklch(0.16 0.03 300 / 0.9), oklch(0.1 0.035 305 / 0.95));
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.05),
      0 6px 16px -10px oklch(0.05 0.02 280 / 0.9);
    transition:
      transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  .tile:hover:not(.unusable) {
    transform: translateY(-3px);
    border-color: color-mix(in oklch, var(--tone) 62%, transparent);
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.08),
      0 0 22px -4px color-mix(in oklch, var(--tone) 55%, transparent),
      0 10px 22px -12px oklch(0.05 0.02 280 / 0.95);
  }

  .tile:active:not(.unusable),
  .tile.pressed {
    transform: translateY(0) scale(0.93);
  }

  .face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }

  .glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(70% 60% at 50% 105%, color-mix(in oklch, var(--tone) 32%, transparent), transparent 72%);
    opacity: 0.6;
    transition: opacity var(--dur-fast) ease;
    pointer-events: none;
  }
  .tile:hover:not(.unusable) .glow {
    opacity: 1;
  }

  .icon {
    position: relative;
    width: 54%;
    height: 54%;
    color: var(--tone);
    filter: drop-shadow(0 0 7px color-mix(in oklch, var(--tone) 60%, transparent));
    transition: transform var(--dur-fast) var(--ease-spring);
  }
  .tile:hover:not(.unusable) .icon {
    transform: scale(1.1);
  }

  .key {
    position: absolute;
    top: 5px;
    left: 7px;
    z-index: 3;
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    text-shadow: 0 1px 4px oklch(0.05 0.02 280 / 0.9);
  }

  .cost {
    position: absolute;
    bottom: 4px;
    right: 7px;
    z-index: 3;
    font-size: 11px;
    font-weight: 640;
    color: var(--mana);
    opacity: 0.9;
  }
  .cost.short {
    color: var(--wound);
  }

  .tile.unusable {
    cursor: default;
  }
  .tile.unusable .icon {
    opacity: 0.32;
    filter: saturate(0.3);
  }
  .tile.unusable .glow {
    opacity: 0;
  }
  .oom .icon {
    opacity: 0.42;
    filter: saturate(0.15) brightness(0.8);
  }

  .tile.casting {
    border-color: var(--tone);
    box-shadow: 0 0 26px -3px color-mix(in oklch, var(--tone) 70%, transparent);
  }

  /* the cast fills the tile from the floor up */
  .castwash {
    position: absolute;
    inset: auto 0 0 0;
    background: linear-gradient(0deg, color-mix(in oklch, var(--tone) 30%, transparent), transparent);
    border-top: 1px solid color-mix(in oklch, var(--tone) 60%, transparent);
    pointer-events: none;
    transition: height 90ms linear;
  }

  .tile.queued {
    border-color: color-mix(in oklch, var(--tone) 70%, transparent);
    animation: queue-throb 700ms ease-in-out infinite alternate;
  }
  @keyframes queue-throb {
    from {
      box-shadow: 0 0 8px -2px color-mix(in oklch, var(--tone) 35%, transparent);
    }
    to {
      box-shadow: 0 0 22px -2px color-mix(in oklch, var(--tone) 70%, transparent);
    }
  }

  /* cooldown: a conic sweep over the tile + the countdown */
  .sweep {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: conic-gradient(oklch(0.08 0.025 300 / 0.82) calc(var(--p) * 1turn), transparent 0);
    pointer-events: none;
  }
  .sweep.gcd {
    background: conic-gradient(oklch(0.08 0.025 300 / 0.4) calc(var(--p) * 1turn), transparent 0);
  }
  .cd {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-items: center;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    text-shadow: 0 1px 6px oklch(0.05 0.02 280 / 0.95);
  }
  .tile.cooling .icon {
    opacity: 0.5;
  }

  .wave {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid var(--tone);
    opacity: 0;
    pointer-events: none;
  }

  /* empowered — the moment's payoff, on fire */
  .tile.empowered {
    border-color: var(--tone);
    animation: empower-throb 900ms ease-in-out infinite alternate;
  }
  .tile.empowered .icon {
    filter: drop-shadow(0 0 12px var(--tone)) brightness(1.35);
  }
  .spark {
    position: absolute;
    top: -8px;
    right: -6px;
    z-index: 4;
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 800;
    color: var(--void-deep);
    background: var(--tone);
    box-shadow: 0 0 12px var(--tone);
    animation: spark-bob 700ms ease-in-out infinite alternate;
  }
  @keyframes spark-bob {
    to {
      transform: translateY(-2px) scale(1.08);
    }
  }
  @keyframes empower-throb {
    from {
      box-shadow: 0 0 12px -2px var(--tone), inset 0 0 10px -6px var(--tone);
    }
    to {
      box-shadow: 0 0 30px 2px color-mix(in oklch, var(--tone) 80%, transparent), inset 0 0 16px -6px var(--tone);
    }
  }

  .name {
    font-size: 11.5px;
    font-weight: 560;
    letter-spacing: 0.01em;
    color: var(--text-dim);
    max-width: calc(var(--tile, 82px) + 14px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }
  .name.dim {
    opacity: 0.45;
  }
  .cell:hover .name {
    color: var(--text);
  }

  /* ---- the staff seat: wood and gilt, not ether ---------------------- */
  .staff-cell {
    margin-right: 6px;
  }
  .staff-cell::after {
    /* a hairline that separates the issued weapon from the taught workings */
    content: '';
    position: absolute;
    top: 8px;
    bottom: 22px;
    right: -9px;
    width: 1px;
    background: linear-gradient(180deg, transparent, oklch(0.78 0.08 82 / 0.28), transparent);
  }
  .tile.staff {
    --tone: oklch(0.78 0.09 85);
    border-color: oklch(0.78 0.09 85 / 0.34);
  }
  .staff-glyph svg {
    width: 100%;
    height: 100%;
  }
  .tile.staff.swinging {
    border-color: color-mix(in oklch, var(--tone) 70%, transparent);
  }
  .tile.staff.armed {
    border-color: var(--ember-glow, oklch(0.8 0.16 55));
    box-shadow: 0 0 22px -6px oklch(0.72 0.19 45 / 0.85);
  }
  .tile.staff.armed .icon {
    color: var(--ember-glow, oklch(0.8 0.16 55));
  }
  /* the wind-up fills the tile from the floor up — the swing you called for */
  .windup {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 2;
    background: linear-gradient(0deg, color-mix(in oklch, var(--tone) 34%, transparent), transparent);
    border-top: 1px solid color-mix(in oklch, var(--tone) 65%, transparent);
    pointer-events: none;
    transition: height 60ms linear;
  }

  /* sealed kit seat */
  .tile.sealed {
    --tile: clamp(64px, 5.8vw, 82px);
    display: grid;
    place-items: center;
    cursor: help;
    border-style: dashed;
    border-color: oklch(0.72 0.19 45 / 0.28);
    color: oklch(0.72 0.12 60 / 0.6);
    opacity: 0.7;
  }
  .tile.sealed .lock {
    width: 40%;
    height: 40%;
  }

  /* ---- one-shot choreography ---------------------------------------- */
  :global(.tile.struck) {
    animation: struck 380ms var(--ease-spring);
  }
  :global(.tile.struck) .wave {
    animation: wave-out 460ms var(--ease-out-expo);
  }
  :global(.tile.struck) .icon {
    animation: icon-flare 380ms ease-out;
  }
  @keyframes struck {
    0% {
      transform: scale(0.9);
    }
    45% {
      transform: scale(1.08);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes wave-out {
    0% {
      opacity: 0.7;
      transform: scale(1);
    }
    60% {
      opacity: 0.12;
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }
  @keyframes icon-flare {
    0% {
      filter: drop-shadow(0 0 18px var(--tone)) brightness(2.4);
      transform: scale(1.2);
    }
    100% {
      filter: drop-shadow(0 0 7px color-mix(in oklch, var(--tone) 60%, transparent)) brightness(1);
      transform: scale(1);
    }
  }
  :global(.tile.ready) {
    animation: ready-flash 520ms var(--ease-out-expo);
  }
  @keyframes ready-flash {
    0% {
      box-shadow: 0 0 0 2px var(--tone), 0 0 30px 2px color-mix(in oklch, var(--tone) 85%, transparent);
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  :global(.tile.refused) {
    animation: refused 260ms ease-out;
  }
  @keyframes refused {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-4px);
      box-shadow: 0 0 0 1px var(--wound), 0 0 18px -4px var(--wound);
    }
    45% {
      transform: translateX(4px);
    }
    70% {
      transform: translateX(-2px);
    }
  }

  /* ---- the tooltip -------------------------------------------------- */
  .tip {
    --sh: 260;
    position: absolute;
    bottom: calc(100% + 14px);
    left: 50%;
    translate: -50% 0;
    width: max-content;
    max-width: 280px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(180deg, oklch(0.17 0.03 300 / 0.98), oklch(0.11 0.035 305 / 0.99));
    border: 1px solid var(--glass-edge);
    box-shadow:
      0 18px 40px -18px oklch(0.03 0.02 280 / 0.95),
      inset 0 1px 0 oklch(1 0 0 / 0.06);
    opacity: 0;
    transform: translateY(6px) scale(0.97);
    transform-origin: bottom center;
    transition:
      opacity var(--dur-fast) ease,
      transform var(--dur-fast) var(--ease-out-expo);
    pointer-events: none;
    z-index: 60;
    text-align: left;
  }
  .tip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% -50%;
    width: 11px;
    height: 11px;
    rotate: 45deg;
    background: oklch(0.12 0.035 305 / 0.99);
    border-right: 1px solid var(--glass-edge);
    border-bottom: 1px solid var(--glass-edge);
  }
  .cell:hover .tip,
  .tile:focus-visible + .name + .tip,
  .cell:focus-within .tip {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .tip-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .tip-name {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }
  .tip-key {
    font-size: 10px;
    font-weight: 640;
    padding: 1px 7px;
    border-radius: 5px;
    color: var(--text-dim);
    border: 1px solid oklch(0.78 0.08 82 / 0.3);
    background: oklch(0.78 0.08 82 / 0.06);
  }
  .tip-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 6px;
  }
  .tag {
    font-size: 9px;
    font-weight: 680;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 99px;
    color: var(--text-dim);
    border: 1px solid oklch(0.85 0.03 260 / 0.16);
  }
  .tag.school {
    color: oklch(0.8 0.13 var(--sh));
    border-color: oklch(0.8 0.13 var(--sh) / 0.4);
    background: oklch(0.8 0.13 var(--sh) / 0.08);
  }
  .tip-stats {
    display: flex;
    gap: 14px;
    margin-top: 10px;
    padding-bottom: 9px;
    border-bottom: 1px solid oklch(0.85 0.03 260 / 0.12);
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .stat-k {
    font-size: 8.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--signal-dim, var(--text-dim));
    opacity: 0.75;
  }
  .stat-v {
    font-size: 13px;
    font-weight: 640;
    color: var(--text);
  }
  .stat-v.short {
    color: var(--wound);
  }
  .tip-desc {
    margin: 9px 0 0;
    font-size: 11.5px;
    line-height: 1.5;
    font-style: italic;
    color: var(--text-dim);
  }
  .tip-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 10.5px;
    font-weight: 620;
    letter-spacing: 0.02em;
  }
  .foot-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 7px currentColor;
  }
  .tip-foot.ready {
    color: var(--life);
  }
  .tip-foot.cd {
    color: var(--text-dim);
  }
  .tip-foot.oom {
    color: var(--mana);
  }
  .tip-foot.hot {
    color: var(--ember, oklch(0.8 0.15 60));
  }
  .tip-foot.cast {
    color: var(--ether);
  }
  .sealed-tip .tip-desc {
    font-style: normal;
  }

  /* ---- the hub ------------------------------------------------------- */
  .hub-cell {
    margin-left: 6px;
    align-self: center;
    padding-top: 0;
  }
  .hub {
    --tile: clamp(64px, 5.8vw, 82px);
    position: relative;
    width: calc(var(--tile) + 18px);
    height: var(--tile);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0;
    cursor: pointer;
    color: oklch(0.86 0.09 calc(var(--zh) * 1));
    border: 1px solid oklch(0.72 0.1 calc(var(--zh) * 1) / 0.4);
    background:
      radial-gradient(90% 80% at 50% 0%, oklch(0.6 0.11 calc(var(--zh) * 1) / 0.18), transparent 70%),
      linear-gradient(180deg, oklch(0.18 0.04 300 / 0.9), oklch(0.11 0.035 305 / 0.96));
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.06),
      0 6px 18px -10px oklch(0.05 0.02 280 / 0.9);
    transition:
      transform var(--dur-fast) var(--ease-spring),
      box-shadow var(--dur-fast) ease,
      filter var(--dur-fast) ease;
  }
  .hub:not(:disabled):hover {
    transform: translateY(-3px);
    filter: brightness(1.12);
    box-shadow: 0 0 26px -6px oklch(0.7 0.13 calc(var(--zh) * 1) / 0.6);
  }
  .hub:not(:disabled):active {
    transform: translateY(0) scale(0.94);
  }
  .hub:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .hub.summon {
    color: var(--ember, oklch(0.8 0.13 80));
    border-color: oklch(0.8 0.13 80 / 0.5);
  }
  .hub.collect {
    color: var(--gilt);
    border-color: oklch(0.78 0.1 85 / 0.5);
  }
  .hub.advance {
    color: oklch(0.84 0.08 205);
    border-color: oklch(0.8 0.09 205 / 0.45);
  }
  .hub.summon,
  .hub.collect {
    animation: hub-invite 1.8s ease-in-out infinite;
  }
  @keyframes hub-invite {
    0%,
    100% {
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 12px -6px currentColor;
    }
    50% {
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 24px -4px currentColor;
    }
  }

  .hub.focus.ready {
    color: oklch(0.82 0.11 195);
    border-color: oklch(0.82 0.11 195 / 0.6);
    animation: focus-ready 1.2s ease-in-out infinite;
  }
  @keyframes focus-ready {
    0%,
    100% {
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 10px -4px oklch(0.82 0.11 195 / 0.6);
    }
    50% {
      box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 26px -2px oklch(0.82 0.11 195 / 0.8);
    }
  }

  .hub-glyph {
    width: 26px;
    height: 26px;
    filter: drop-shadow(0 0 7px currentColor);
  }
  .hub-glyph.eye {
    width: 30px;
    height: 22px;
  }
  .hub-arc {
    position: absolute;
    inset: 6px;
    width: auto;
    height: auto;
    transform: rotate(-90deg);
    opacity: 0.5;
  }
  .arc-track {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.12);
    stroke-width: 3;
  }
  .arc-cd {
    fill: none;
    stroke: oklch(0.82 0.11 195 / 0.6);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .hub-word {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 620;
    letter-spacing: 0.06em;
  }
  .hub-word.dim {
    color: var(--text-dim);
  }
  .hub-key {
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  @media (prefers-reduced-motion: reduce) {
    .tile.queued,
    .tile.empowered,
    .spark,
    .hub.summon,
    .hub.collect,
    .hub.focus.ready,
    :global(.tile.struck),
    :global(.tile.struck) .wave,
    :global(.tile.struck) .icon,
    :global(.tile.ready),
    :global(.tile.refused) {
      animation: none;
    }
  }
</style>
