<script lang="ts">
  import type { AbilityDef } from '../../engine'
  import { GCD_TICKS } from '../../engine'
  import { ticksToSeconds } from '../format'
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
    onactivate?: () => void
  } = $props()

  const cdFraction = $derived(def.cooldownTicks > 0 ? cooldown / def.cooldownTicks : 0)
  const gcdFraction = $derived(gcd / GCD_TICKS)
  const oom = $derived(!locked && mana < def.manaCost)
  const TONES: Record<string, string> = {
    fireball: 'var(--wound)',
    ignite: 'var(--arcana)',
    renew: 'var(--life)',
    pyroblast: 'oklch(0.75 0.15 45)',
    counterspell: 'var(--ether)',
    barrier: 'var(--shield)',
    combustion: 'var(--ember)',
  }
  const tone = $derived(TONES[def.id] ?? 'var(--ether)')
  const tip = $derived(
    locked
      ? `${def.name} — unlocks at level ${def.unlockLevel}`
      : `${def.name} (${def.key}) — ${def.manaCost} mana${def.cooldownTicks ? `, ${ticksToSeconds(def.cooldownTicks)}s cooldown` : ''}\n${def.description}`,
  )
</script>

<button
  class="ability"
  class:unusable={!usable || locked}
  class:locked
  class:casting
  class:queued
  class:oom
  class:pressed
  style:--tone={tone}
  onclick={() => onactivate?.()}
  aria-label="{def.name} (key {def.key})"
  aria-keyshortcuts={def.key}
  aria-disabled={!usable || locked}
  title={tip}
>
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
      <span class="cd num">{ticksToSeconds(cooldown)}</span>
    {:else if gcd > 0 && !casting}
      <span class="wipe gcd-wipe" style:--p={gcdFraction}></span>
    {/if}
  {/if}
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
    overflow: hidden;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  .ability.unusable {
    cursor: default;
  }

  .ability:hover:not(.unusable) {
    border-color: color-mix(in oklch, var(--tone) 55%, transparent);
    box-shadow: 0 0 18px -4px color-mix(in oklch, var(--tone) 45%, transparent);
  }

  .ability:active:not(.unusable),
  .ability.pressed {
    transform: scale(0.9);
  }

  .ability.casting {
    border-color: var(--ether);
    box-shadow: 0 0 20px -4px oklch(0.8 0.11 195 / 0.55);
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
      box-shadow: 0 0 18px -2px color-mix(in oklch, var(--tone) 65%, transparent);
    }
  }

  .icon {
    position: absolute;
    inset: 14px;
    color: var(--tone);
    filter: drop-shadow(0 0 5px color-mix(in oklch, var(--tone) 55%, transparent));
  }

  .unusable .icon {
    opacity: 0.38;
    filter: saturate(0.4);
  }

  .oom .icon {
    opacity: 0.45;
    filter: saturate(0.2) brightness(0.8) hue-rotate(180deg);
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

  @media (prefers-reduced-motion: reduce) {
    .ability.queued {
      animation: none;
    }
  }
</style>
