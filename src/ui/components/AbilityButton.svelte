<script lang="ts">
  import type { AbilityDef } from '../../engine'
  import { ticksToSeconds } from '../format'
  import AbilityIcon from './icons/AbilityIcon.svelte'

  let {
    def,
    cooldown = 0,
    usable = true,
    casting = false,
    pressed = false,
    onactivate,
  }: {
    def: AbilityDef
    /** remaining cooldown ticks */
    cooldown?: number
    usable?: boolean
    casting?: boolean
    pressed?: boolean
    onactivate?: () => void
  } = $props()

  const cdFraction = $derived(def.cooldownTicks > 0 ? cooldown / def.cooldownTicks : 0)
  const tone = $derived(def.id === 'fireball' ? 'var(--wound)' : def.id === 'ignite' ? 'var(--arcana)' : 'var(--life)')
</script>

<button
  class="ability"
  class:unusable={!usable}
  class:casting
  class:pressed
  style:--tone={tone}
  onclick={() => onactivate?.()}
  aria-label="{def.name} (key {def.key})"
  aria-keyshortcuts={def.key}
  disabled={!usable && cooldown === 0 && !casting}
>
  <span class="icon"><AbilityIcon id={def.id} /></span>
  <span class="key num">{def.key}</span>
  {#if cooldown > 0}
    <span class="wipe" style:--p={cdFraction}></span>
    <span class="cd num">{ticksToSeconds(cooldown)}</span>
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

  .key {
    position: absolute;
    top: 3px;
    left: 6px;
    font-size: 10.5px;
    font-weight: 640;
    color: var(--text-dim);
  }

  /* Cooldown: radial conic wipe, native to the web. */
  .wipe {
    position: absolute;
    inset: 0;
    background: conic-gradient(oklch(0.1 0.025 280 / 0.78) calc(var(--p) * 1turn), transparent 0);
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
</style>
