<script lang="ts">
  import type { AbilityDef } from '../../engine'
  import { GCD_TICKS } from '../../engine'
  import { cooldownLabel, ticksToSeconds } from '../format'
  import AbilityIcon from './icons/AbilityIcon.svelte'

  let {
    def,
    cooldown = 0,
    usable = true,
    locked = false,
    casting = false,
    queued = false,
    gcd = 0,
    mana = 0,
    pressed = false,
    denied = 0,
    onactivate,
  }: {
    def: AbilityDef
    /** remaining cooldown ticks */
    cooldown?: number
    usable?: boolean
    /** below unlock level */
    locked?: boolean
    casting?: boolean
    queued?: boolean
    /** remaining global cooldown ticks */
    gcd?: number
    /** current mana, for the cost readout */
    mana?: number
    pressed?: boolean
    /** bump counter: the player pressed this and the sim said no */
    denied?: number
    onactivate?: () => void
  } = $props()

  const cdFraction = $derived(def.cooldownTicks > 0 ? cooldown / def.cooldownTicks : 0)
  const gcdFraction = $derived(gcd / GCD_TICKS)
  const oom = $derived(!locked && mana < def.manaCost)

  const tip = $derived(
    locked
      ? `${def.name} — unlocks at level ${def.unlockLevel}`
      : `${def.name} (${def.key}) — ${def.manaCost} mana${def.cooldownTicks ? `, ${ticksToSeconds(def.cooldownTicks)}s cooldown` : ''}\n${def.description}`,
  )

  let el: HTMLButtonElement | undefined = $state()

  function pulse(cls: string): void {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  // The cooldown finishing is *news*. Flash, the way every good game client does.
  let wasCoolingDown = false
  $effect(() => {
    const cooling = cooldown > 0
    if (!cooling && wasCoolingDown && !locked) pulse('ready')
    wasCoolingDown = cooling
  })

  // Refused: no mana, no target, still cooling. Say no with the body.
  let lastDenied = 0
  $effect(() => {
    if (denied > lastDenied) pulse('refused')
    lastDenied = denied
  })

  // The press itself — keyboard presses arrive as `pressed`, clicks fire inline.
  $effect(() => {
    if (pressed) pulse('struck')
  })
</script>

<button
  bind:this={el}
  class="ability"
  class:unusable={!usable || locked}
  class:locked
  class:casting
  class:queued
  class:oom
  class:pressed
  style:--tone="var(--tone-{def.id})"
  onclick={() => {
    onactivate?.()
    pulse('struck')
  }}
  aria-label="{def.name} (key {def.key})"
  aria-keyshortcuts={def.key}
  aria-disabled={!usable || locked}
  title={tip}
>
  <span class="glow" aria-hidden="true"></span>
  <span class="icon"><AbilityIcon id={def.id} /></span>
  <span class="key num">{def.key}</span>

  {#if locked}
    <span class="lock">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="4" y="7" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
        <path d="M5.5 7 V5.5 a2.5 2.5 0 0 1 5 0 V7" fill="none" stroke="currentColor" stroke-width="1.4" />
      </svg>
      <span class="lock-level num">Lv {def.unlockLevel}</span>
    </span>
  {:else}
    {#if def.manaCost > 0}
      <span class="cost num" class:short={oom}>{def.manaCost}</span>
    {/if}
    {#if cooldown > 0}
      <span class="wipe" style:--p={cdFraction}></span>
      <span class="cd num">{cooldownLabel(cooldown)}</span>
    {:else if gcd > 0 && !casting}
      <span class="wipe gcd-wipe" style:--p={gcdFraction}></span>
    {/if}
  {/if}

  <!-- the shockwave a press throws off; sits above the cooldown wipe -->
  <span class="wave" aria-hidden="true"></span>
</button>

<style>
  .ability {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: var(--radius);
    border: 1px solid oklch(0.85 0.03 260 / 0.14);
    background:
      linear-gradient(180deg, oklch(0.8 0.02 260 / 0.09), oklch(0.8 0.02 260 / 0.03)),
      var(--void-deep);
    cursor: pointer;
    overflow: visible;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  /* A ready spell is not inert — it breathes its own colour. */
  .glow {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(circle at 50% 120%, color-mix(in oklch, var(--tone) 26%, transparent), transparent 70%);
    opacity: 0.55;
    transition: opacity var(--dur-fast) ease;
  }

  .ability.unusable {
    cursor: default;
  }

  .unusable .glow {
    opacity: 0;
  }

  .ability:hover:not(.unusable) {
    border-color: color-mix(in oklch, var(--tone) 62%, transparent);
    box-shadow:
      0 0 24px -4px color-mix(in oklch, var(--tone) 55%, transparent),
      0 0 0 1px color-mix(in oklch, var(--tone) 30%, transparent);
    transform: translateY(-2px);
  }

  .ability:hover:not(.unusable) .glow {
    opacity: 1;
  }

  .ability:hover:not(.unusable) .icon {
    transform: scale(1.08);
  }

  .ability:active:not(.unusable),
  .ability.pressed {
    transform: scale(0.88) translateY(0);
  }

  .ability.casting {
    border-color: var(--tone);
    box-shadow: 0 0 26px -3px color-mix(in oklch, var(--tone) 70%, transparent);
  }

  .ability.queued {
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
    inset: 14px;
    color: var(--tone);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--tone) 65%, transparent));
    transition: transform var(--dur-fast) var(--ease-spring);
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
    top: 3px;
    left: 6px;
    font-size: 10.5px;
    font-weight: 640;
    color: var(--text-dim);
  }

  .cost {
    position: absolute;
    bottom: 3px;
    right: 6px;
    font-size: 10px;
    font-weight: 640;
    color: var(--mana);
    opacity: 0.85;
  }

  .cost.short {
    color: var(--wound);
  }

  .lock {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border-radius: inherit;
    color: var(--text-dim);
    background: oklch(0.1 0.025 280 / 0.55);
  }

  .lock svg {
    width: 15px;
    height: 15px;
  }

  .lock-level {
    font-size: 9.5px;
    font-weight: 640;
    letter-spacing: 0.06em;
  }

  .locked .icon {
    opacity: 0.2;
  }

  /* Cooldown: radial conic wipe, native to the web. */
  .wipe {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: conic-gradient(oklch(0.1 0.025 280 / 0.78) calc(var(--p) * 1turn), transparent 0);
  }

  /* GCD: same language, a whisper instead of a shout. */
  .gcd-wipe {
    background: conic-gradient(oklch(0.1 0.025 280 / 0.45) calc(var(--p) * 1turn), transparent 0);
  }

  .cd {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 15px;
    font-weight: 660;
    color: var(--text);
    text-shadow: 0 1px 6px oklch(0.1 0.025 280 / 0.9);
  }

  /* ---- one-shot choreography ---------------------------------------- */

  .wave {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    border: 2px solid var(--tone);
  }

  /* Press: the button takes the blow and throws a ring of its own colour.
     These classes are armed from script, so they must be :global. */
  :global(.ability.struck) {
    animation: struck 380ms var(--ease-spring);
  }

  :global(.ability.struck) .wave {
    animation: wave-out 460ms var(--ease-out-expo);
  }

  :global(.ability.struck) .icon {
    animation: icon-flare 380ms ease-out;
  }

  @keyframes struck {
    0% {
      transform: scale(0.84);
    }
    45% {
      transform: scale(1.07);
    }
    100% {
      transform: scale(1);
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
      transform: scale(1.75);
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

  /* Cooldown finished: a bright sweep, so you know without reading. */
  :global(.ability.ready) {
    animation: ready-flash 520ms var(--ease-out-expo);
  }

  @keyframes ready-flash {
    0% {
      box-shadow:
        0 0 0 2px var(--tone),
        0 0 34px 2px color-mix(in oklch, var(--tone) 85%, transparent);
      transform: scale(1.1);
    }
    100% {
      box-shadow:
        0 0 0 0 transparent,
        0 0 0 0 transparent;
      transform: scale(1);
    }
  }

  /* Refused: a hard, short "no". */
  :global(.ability.refused) {
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

  @media (prefers-reduced-motion: reduce) {
    .ability.queued,
    :global(.ability.struck),
    :global(.ability.struck) .wave,
    :global(.ability.struck) .icon,
    :global(.ability.ready),
    :global(.ability.refused) {
      animation: none;
    }
  }
</style>
