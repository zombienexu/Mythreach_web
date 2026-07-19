<script lang="ts">
  import { untrack } from 'svelte'
  import { ABILITIES, GCD_TICKS, type AbilityId, type CastSnapshot } from '../../engine'
  import { cooldownLabel, ticksToSeconds } from '../format'
  import AbilityIcon from './icons/AbilityIcon.svelte'

  /** What the heart of the wheel offers right now. `focus` is combat: it shows
   *  the cast in flight and the GCD — and is the reserved seat for a melee
   *  strike, when the sim grows one. */
  export type HubMode = 'summon' | 'focus' | 'collect' | 'fallen'

  let {
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
    hue = 260,
    empowered = null,
    onactivate,
    onhub,
  }: {
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
    hue?: number
    /** An ability the moment has empowered (Hot Streak → instant): its socket
     *  is lit and urged. */
    empowered?: AbilityId | null
    onactivate?: (id: AbilityId) => void
    onhub?: () => void
  } = $props()

  const SLOTS = 10
  const STEP = 360 / SLOTS

  /** Cumulative wheel angle — never normalised, so the turn always animates
   *  along the shortest arc instead of unwinding a full revolution. */
  let wheel = $state(0)
  let active = $state(0)

  function turnTo(i: number): void {
    // untrack: turnTo is called from $effects, and reading `wheel` here would
    // otherwise register it as a dependency of those effects. Two effects that
    // both write the wheel (key press vs. cast start) then re-trigger each
    // other forever — effect_update_depth_exceeded, and the game hangs.
    untrack(() => {
      const delta = ((((-i * STEP - wheel) % 360) + 540) % 360) - 180
      wheel += delta
      active = i
    })
  }

  // A pressed hotkey swings its socket up under the needle.
  $effect(() => {
    for (let i = 0; i < abilityIds.length; i++) {
      const id = abilityIds[i]
      if (id && pressedKeys.has(ABILITIES[id].key)) {
        turnTo(i)
        break
      }
    }
  })

  // A cast beginning (yours or auto-battle's) also claims the apex, so the
  // wheel keeps turning like an orrery even when the keys are quiet.
  $effect(() => {
    const id = cast?.abilityId
    if (!id) return
    const i = abilityIds.indexOf(id)
    if (i >= 0) turnTo(i)
  })

  // Keep the last cast visible in the heart while it fades.
  let lastCast: CastSnapshot | null = $state(null)
  $effect(() => {
    if (cast !== null) lastCast = cast
  })
  const shownCast = $derived(cast ?? lastCast)
  const castTone = $derived(shownCast ? `var(--tone-${shownCast.abilityId})` : 'var(--ether)')
  const gcdFraction = $derived(Math.max(0, Math.min(1, gcd / GCD_TICKS)))

  /** One-shot choreography per socket, armed from data changes: the press,
   *  the refusal, the cooldown coming back. */
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

  function tip(id: AbilityId): string {
    const def = ABILITIES[id]
    return `${def.name} (${def.key}) — ${def.manaCost} mana${def.cooldownTicks ? `, ${ticksToSeconds(def.cooldownTicks)}s cooldown` : ''}\n${def.description}`
  }

  const hubLabel = $derived(
    hub === 'summon'
      ? 'Start fight'
      : hub === 'collect'
        ? 'Loot all'
        : hub === 'fallen'
          ? 'Fallen — waiting to revive'
          : 'The heart of the wheel',
  )
</script>

<div class="wheel" style:--zh={hue} role="toolbar" aria-label="Abilities">
  <!-- chrome: rim, degree ticks, a slow counter-turning inner band -->
  <span class="rim" aria-hidden="true"></span>
  <span class="ticks" aria-hidden="true"></span>
  <span class="whirl" aria-hidden="true"></span>
  <span class="needle" aria-hidden="true"></span>

  <div class="ring" style:transform="rotate({wheel}deg)">
    {#each Array.from({ length: SLOTS }) as _, i (i)}
      {@const id = abilityIds[i] ?? null}
      {@const def = id ? ABILITIES[id] : null}
      {@const known = def !== null && id !== null && unlocked.includes(id)}
      <div class="arm" style:transform="translate(-50%, -50%) rotate({i * STEP}deg) translateY(calc(var(--ws) * -0.383))">
        <div class="keep" style:transform="rotate({-i * STEP - wheel}deg)">
          {#if def && id && known}
            <button
              class="socket"
              class:apex={i === active}
              class:unusable={!usable[id]}
              class:oom={mana < def.manaCost}
              class:casting={cast?.abilityId === id}
              class:queued={queued === id}
              class:empowered={id === empowered}
              class:pressed={pressedKeys.has(def.key)}
              style:--tone="var(--tone-{id})"
              use:choreo={{ pressed: pressedKeys.has(def.key), denied: denied[id], cooldown: cooldowns[id] }}
              onclick={() => {
                turnTo(i)
                onactivate?.(id)
              }}
              aria-label="{def.name} (key {def.key})"
              aria-keyshortcuts={def.key}
              aria-disabled={!usable[id]}
              title={tip(id)}
            >
              <span class="glow" aria-hidden="true"></span>
              <span class="icon"><AbilityIcon {id} /></span>
              <span class="key num">{def.key}</span>
              {#if cooldowns[id] > 0}
                <span class="wipe" style:--p={def.cooldownTicks > 0 ? cooldowns[id] / def.cooldownTicks : 0}></span>
                <span class="cd num">{cooldownLabel(cooldowns[id])}</span>
              {:else if gcd > 0 && cast?.abilityId !== id}
                <span class="wipe gcd-wipe" style:--p={gcdFraction}></span>
              {/if}
              <span class="wave" aria-hidden="true"></span>
            </button>
          {:else if def && id}
            <!-- a kit seat the world hasn't taught yet: sealed, not empty —
                 so the wheel reads as a kit still being earned. -->
            <span class="sealed" aria-hidden="true" title="{def.name} — sealed until the Legion teaches it">
              <span class="sealed-key num">{def.key}</span>
            </span>
          {:else}
            <!-- a truly empty seat beyond the kit -->
            <span class="stud" aria-hidden="true"></span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- the heart -->
  <div class="hub" class:live={hub === 'summon' || hub === 'collect'} class:gilt={hub === 'collect'}>
    <button
      class="heart"
      disabled={hub === 'focus' || hub === 'fallen'}
      onclick={() => onhub?.()}
      aria-label={hubLabel}
      title={hub === 'summon' ? 'Call the next foes up out of the dark (Space)' : hub === 'collect' ? 'Collect every spoil (Space or R)' : undefined}
    >
      {#if hub === 'summon'}
        <span class="heart-ring outer" aria-hidden="true"></span>
        <span class="heart-ring inner" aria-hidden="true"></span>
        <svg class="heart-glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.6 L14.3 9.7 L21.4 12 L14.3 14.3 L12 21.4 L9.7 14.3 L2.6 12 L9.7 9.7 Z" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="var(--void-deep)" />
        </svg>
        <span class="heart-word">Fight</span>
      {:else if hub === 'collect'}
        <span class="heart-ring outer" aria-hidden="true"></span>
        <svg class="heart-glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z" fill="currentColor" opacity="0.9" />
        </svg>
        <span class="heart-word">Loot all</span>
        <span class="heart-hint num">R</span>
      {:else if hub === 'fallen'}
        <span class="heart-word dim">Fallen</span>
        <span class="heart-count num">{ticksToSeconds(respawnIn)}s</span>
      {:else}
        <!-- focus: the cast in flight, or the wheel breathing between spells -->
        <svg class="hub-arc" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="arc-track" cx="50" cy="50" r="44" pathLength="100" />
          {#if cast}
            <circle
              class="arc-cast"
              cx="50"
              cy="50"
              r="44"
              pathLength="100"
              style:stroke={castTone}
              style:stroke-dasharray="{cast.progress * 100} 100"
            />
          {:else if gcd > 0}
            <circle class="arc-gcd" cx="50" cy="50" r="44" pathLength="100" style:stroke-dasharray="{(1 - gcdFraction) * 100} 100" />
          {/if}
        </svg>
        {#if shownCast}
          <span class="cast-icon" class:fading={cast === null} style:color={castTone}>
            <AbilityIcon id={shownCast.abilityId} />
          </span>
          {#if cast}
            <span class="cast-name" style:color={castTone}>{ABILITIES[shownCast.abilityId].name}</span>
            <span class="cast-time num">{ticksToSeconds(cast.remainingTicks)}s</span>
          {/if}
        {:else}
          <span class="idle-glyph" aria-hidden="true">✦</span>
        {/if}
      {/if}
    </button>
  </div>
</div>

<style>
  .wheel {
    --ws: clamp(216px, 28vh, 274px);
    position: relative;
    width: var(--ws);
    height: var(--ws);
    flex: none;
  }

  /* ---- chrome ------------------------------------------------------- */

  .rim {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid oklch(0.78 0.08 82 / 0.28);
    background: radial-gradient(
      circle,
      transparent 54%,
      oklch(0.6 0.08 calc(var(--zh) * 1) / 0.05) 72%,
      oklch(0.6 0.08 calc(var(--zh) * 1) / 0.1) 99%,
      transparent 100%
    );
    box-shadow:
      inset 0 0 34px -12px oklch(0.7 0.1 calc(var(--zh) * 1) / 0.5),
      0 0 44px -18px oklch(0.7 0.12 calc(var(--zh) * 1) / 0.55),
      0 24px 50px -24px oklch(0.05 0.02 280 / 0.9);
  }

  /* ten engraved degree marks, one per seat */
  .ticks {
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: repeating-conic-gradient(
      from -0.75deg,
      oklch(0.8 0.09 85 / 0.55) 0deg 1.5deg,
      transparent 1.5deg 36deg
    );
    mask: radial-gradient(circle, transparent 0 47.2%, #fff 47.4% 49.6%, transparent 49.8%);
  }

  .whirl {
    position: absolute;
    inset: calc(var(--ws) * 0.245);
    border-radius: 50%;
    border: 1px dashed oklch(0.75 0.1 calc(var(--zh) * 1) / 0.35);
    animation: whirl-turn 60s linear infinite reverse;
  }

  @keyframes whirl-turn {
    to {
      rotate: 360deg;
    }
  }

  /* the fixed pointer every activated seat swings up to meet */
  .needle {
    position: absolute;
    top: calc(var(--ws) * -0.012);
    left: 50%;
    translate: -50% 0;
    width: 12px;
    height: 11px;
    background: var(--gilt);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    filter: drop-shadow(0 0 7px oklch(0.78 0.1 85 / 0.8));
    z-index: 4;
  }

  /* ---- the turning ring --------------------------------------------- */

  .ring {
    position: absolute;
    inset: 0;
    transition: transform 620ms var(--ease-out-expo);
    will-change: transform;
  }

  .arm {
    position: absolute;
    top: 50%;
    left: 50%;
    width: calc(var(--ws) * 0.19);
    height: calc(var(--ws) * 0.19);
  }

  /* counter-rotation: the seat travels, its face stays upright */
  .keep {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    transition: transform 620ms var(--ease-out-expo);
    will-change: transform;
  }

  /* ---- sockets ------------------------------------------------------ */

  .socket {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 1px solid oklch(0.85 0.03 260 / 0.16);
    background:
      radial-gradient(circle at 50% 30%, oklch(0.8 0.02 260 / 0.1), oklch(0.8 0.02 260 / 0.02) 70%),
      oklch(0.09 0.035 305 / 0.88);
    cursor: pointer;
    padding: 0;
    overflow: visible;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  .socket.apex {
    transform: scale(1.16);
    border-color: color-mix(in oklch, var(--tone) 55%, transparent);
    box-shadow: 0 0 22px -5px color-mix(in oklch, var(--tone) 60%, transparent);
    z-index: 2;
  }

  .glow {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(circle at 50% 115%, color-mix(in oklch, var(--tone) 28%, transparent), transparent 70%);
    opacity: 0.55;
    transition: opacity var(--dur-fast) ease;
  }

  .socket.unusable {
    cursor: default;
  }

  .socket.unusable .glow {
    opacity: 0;
  }

  .socket:hover:not(.unusable) {
    border-color: color-mix(in oklch, var(--tone) 62%, transparent);
    box-shadow:
      0 0 24px -4px color-mix(in oklch, var(--tone) 55%, transparent),
      0 0 0 1px color-mix(in oklch, var(--tone) 30%, transparent);
  }

  .socket:hover:not(.unusable) .glow {
    opacity: 1;
  }

  .socket:active:not(.unusable),
  .socket.pressed {
    transform: scale(0.9);
  }

  .socket.apex.pressed,
  .socket.apex:active:not(.unusable) {
    transform: scale(1.02);
  }

  .socket.casting {
    border-color: var(--tone);
    box-shadow: 0 0 26px -3px color-mix(in oklch, var(--tone) 70%, transparent);
  }

  .socket.queued {
    border-color: color-mix(in oklch, var(--tone) 70%, transparent);
    animation: queue-throb 700ms ease-in-out infinite alternate;
  }

  @keyframes queue-throb {
    from {
      box-shadow: 0 0 8px -2px color-mix(in oklch, var(--tone) 35%, transparent);
    }
    to {
      box-shadow: 0 0 20px -2px color-mix(in oklch, var(--tone) 70%, transparent);
    }
  }

  .icon {
    position: absolute;
    inset: 22%;
    color: var(--tone);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--tone) 65%, transparent));
    transition: transform var(--dur-fast) var(--ease-spring);
  }

  .socket:hover:not(.unusable) .icon {
    transform: scale(1.08);
  }

  .unusable .icon {
    opacity: 0.34;
    filter: saturate(0.35);
  }

  .oom .icon {
    opacity: 0.4;
    filter: saturate(0.15) brightness(0.75);
  }

  .key {
    position: absolute;
    top: 6%;
    left: 14%;
    font-size: 10px;
    font-weight: 640;
    color: var(--text-dim);
  }

  .wipe {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: conic-gradient(oklch(0.1 0.025 280 / 0.78) calc(var(--p) * 1turn), transparent 0);
  }

  .gcd-wipe {
    background: conic-gradient(oklch(0.1 0.025 280 / 0.45) calc(var(--p) * 1turn), transparent 0);
  }

  .cd {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 660;
    color: var(--text);
    text-shadow: 0 1px 6px oklch(0.1 0.025 280 / 0.9);
  }

  .wave {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    border: 2px solid var(--tone);
  }

  /* an empty seat — faint, engraved, incurious */
  .stud {
    width: 26%;
    height: 26%;
    border-radius: 50%;
    border: 1px solid oklch(0.78 0.08 82 / 0.2);
    background: radial-gradient(circle, oklch(0.78 0.08 82 / 0.12) 0%, transparent 70%);
  }

  /* a sealed kit seat — something waits here, not yet taught */
  .sealed {
    position: relative;
    width: 58%;
    height: 58%;
    border-radius: 50%;
    border: 1px dashed oklch(0.72 0.19 45 / 0.32);
    background: radial-gradient(circle at 50% 35%, oklch(0.72 0.19 45 / 0.08), transparent 72%);
    display: grid;
    place-items: center;
    opacity: 0.7;
  }
  .sealed-key {
    font-size: 10px;
    color: oklch(0.72 0.19 45 / 0.6);
  }

  /* Hot Streak: the empowered socket burns and beckons */
  .socket.empowered {
    border-color: var(--tone);
    animation: empower-throb 900ms ease-in-out infinite alternate;
  }
  .socket.empowered .icon {
    filter: drop-shadow(0 0 12px var(--tone)) brightness(1.35);
  }
  @keyframes empower-throb {
    from {
      box-shadow: 0 0 12px -2px var(--tone), inset 0 0 10px -6px var(--tone);
    }
    to {
      box-shadow: 0 0 30px 2px color-mix(in oklch, var(--tone) 80%, transparent), inset 0 0 16px -6px var(--tone);
    }
  }

  /* ---- socket one-shots (classes armed from script) ----------------- */

  :global(.socket.struck) {
    animation: struck 380ms var(--ease-spring);
  }

  :global(.socket.struck) .wave {
    animation: wave-out 460ms var(--ease-out-expo);
  }

  :global(.socket.struck) .icon {
    animation: icon-flare 380ms ease-out;
  }

  @keyframes struck {
    0% {
      transform: scale(0.86);
    }
    45% {
      transform: scale(1.18);
    }
    100% {
      transform: scale(1.16);
    }
  }

  @keyframes wave-out {
    0% {
      opacity: 0.75;
      transform: scale(1);
    }
    60% {
      opacity: 0.12;
    }
    100% {
      opacity: 0;
      transform: scale(1.9);
    }
  }

  @keyframes icon-flare {
    0% {
      filter: drop-shadow(0 0 18px var(--tone)) brightness(2.4);
      transform: scale(1.25);
    }
    100% {
      filter: drop-shadow(0 0 6px color-mix(in oklch, var(--tone) 65%, transparent)) brightness(1);
      transform: scale(1);
    }
  }

  :global(.socket.ready) {
    animation: ready-flash 520ms var(--ease-out-expo);
  }

  @keyframes ready-flash {
    0% {
      box-shadow:
        0 0 0 2px var(--tone),
        0 0 34px 2px color-mix(in oklch, var(--tone) 85%, transparent);
    }
    100% {
      box-shadow:
        0 0 0 0 transparent,
        0 0 0 0 transparent;
    }
  }

  :global(.socket.refused) {
    animation: refused 260ms ease-out;
  }

  @keyframes refused {
    0%,
    100% {
      translate: 0 0;
    }
    20% {
      translate: -4px 0;
      box-shadow: 0 0 0 1px var(--wound), 0 0 18px -4px var(--wound);
    }
    45% {
      translate: 4px 0;
    }
    70% {
      translate: -2px 0;
    }
  }

  /* ---- the heart ---------------------------------------------------- */

  .hub {
    position: absolute;
    inset: calc(var(--ws) * 0.295);
    border-radius: 50%;
    display: grid;
    place-items: center;
  }

  .heart {
    position: relative;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0;
    cursor: default;
    color: oklch(0.85 0.09 calc(var(--zh) * 1));
    background: radial-gradient(
      circle,
      oklch(0.6 0.11 calc(var(--zh) * 1) / 0.1) 0%,
      oklch(0.6 0.11 calc(var(--zh) * 1) / 0.03) 62%,
      transparent 72%
    );
    transition:
      transform var(--dur-fast) var(--ease-spring),
      filter var(--dur-fast) ease;
  }

  .hub.live .heart {
    cursor: pointer;
  }

  .hub.gilt .heart {
    color: var(--gilt);
    background: radial-gradient(circle, oklch(0.78 0.1 85 / 0.12) 0%, oklch(0.78 0.1 85 / 0.03) 62%, transparent 72%);
  }

  .hub.live .heart:hover {
    transform: scale(1.05);
    filter: brightness(1.25);
  }

  .hub.live .heart:active {
    transform: scale(0.94);
  }

  .heart-ring {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .heart-ring.outer {
    inset: 4%;
    border: 1.5px dashed currentColor;
    opacity: 0.55;
    animation: heart-turn 26s linear infinite;
  }

  .heart-ring.inner {
    inset: 13%;
    border: 1px solid currentColor;
    opacity: 0.35;
    box-shadow:
      inset 0 0 18px -4px oklch(0.7 0.13 calc(var(--zh) * 1) / 0.4),
      0 0 22px -6px oklch(0.7 0.13 calc(var(--zh) * 1) / 0.5);
    animation: heart-turn 40s linear infinite reverse;
  }

  @keyframes heart-turn {
    to {
      rotate: 360deg;
    }
  }

  .heart-glyph {
    width: 26px;
    height: 26px;
    filter: drop-shadow(0 0 8px currentColor);
    transition: transform var(--dur) var(--ease-spring);
  }

  .hub.live .heart:hover .heart-glyph {
    transform: rotate(90deg) scale(1.12);
  }

  .heart-word {
    font-family: var(--font-display);
    font-size: 12.5px;
    font-weight: 640;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .heart-word.dim {
    color: var(--text-dim);
  }

  .heart-hint {
    font-size: 10px;
    color: var(--text-dim);
    border: 1px solid oklch(0.78 0.1 85 / 0.4);
    border-radius: 4px;
    padding: 0 6px;
  }

  .heart-count {
    font-size: 14px;
    font-weight: 640;
    color: var(--text);
  }

  /* focus mode: the cast lives here */
  .hub-arc {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .arc-track {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.12);
    stroke-width: 2.5;
  }

  .arc-cast {
    fill: none;
    stroke-width: 3.5;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px color-mix(in oklch, currentColor 70%, transparent));
  }

  .arc-gcd {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.3);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .cast-icon {
    width: 30%;
    height: 30%;
    filter: drop-shadow(0 0 10px color-mix(in oklch, currentColor 70%, transparent));
    transition: opacity var(--dur) ease;
  }

  .cast-icon.fading {
    opacity: 0;
  }

  .cast-name {
    font-family: var(--font-display);
    font-size: 11.5px;
    letter-spacing: 0.03em;
    max-width: 86%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-shadow: 0 0 14px color-mix(in oklch, currentColor 55%, transparent);
  }

  .cast-time {
    font-size: 10.5px;
    color: var(--text-dim);
  }

  .idle-glyph {
    font-size: 15px;
    opacity: 0.3;
    animation: idle-breathe 4.2s ease-in-out infinite alternate;
  }

  @keyframes idle-breathe {
    from {
      opacity: 0.18;
      transform: scale(0.94);
    }
    to {
      opacity: 0.42;
      transform: scale(1.04);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .whirl,
    .heart-ring,
    .idle-glyph,
    .socket.queued,
    .socket.empowered,
    :global(.socket.struck),
    :global(.socket.struck) .wave,
    :global(.socket.struck) .icon,
    :global(.socket.ready),
    :global(.socket.refused) {
      animation: none;
    }
  }
</style>
