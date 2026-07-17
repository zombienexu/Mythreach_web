<script lang="ts">
  import { CLASS_BY_ID, type ClassId } from '../content/identity'

  /** One sigil per calling — line-art in the class's own hue, drawn in the
   *  same duotone hand as the portraits. `dim` mutes a sealed calling. */
  let { classId, dim = false }: { classId: ClassId; dim?: boolean } = $props()

  const hue = $derived(CLASS_BY_ID[classId].hue)
</script>

<svg
  viewBox="0 0 48 48"
  role="img"
  aria-label="{CLASS_BY_ID[classId].name} emblem"
  style:--ch={hue}
  class:dim
>
  <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    {#if classId === 'arcanist'}
      <!-- the candle that answers back: a flame held in a ring -->
      <circle cx="24" cy="26" r="16" opacity="0.5" />
      <path d="M24 14 C29 20 31 24 31 29 A7 7 0 0 1 17 29 C17 24 19 20 24 14 Z" fill="oklch(0.75 0.13 var(--ch) / 0.12)" />
      <path d="M24 23 C26 26 26.6 28 26.6 30 A2.6 2.6 0 0 1 21.4 30 C21.4 28 22 26 24 23 Z" stroke-width="1.2" />
      <path d="M24 3 L26 7 L24 11 L22 7 Z" stroke-width="1.2" opacity="0.9" />
    {:else if classId === 'gravewright'}
      <!-- the ledger of the dead: a headstone, a page, a sprout -->
      <path d="M14 40 V20 A10 10 0 0 1 34 20 V40" fill="oklch(0.75 0.13 var(--ch) / 0.08)" />
      <path d="M10 40 H38" />
      <path d="M19 24 H29 M19 29 H27 M19 34 H29" stroke-width="1.2" opacity="0.75" />
      <path d="M24 16 C24 12 26 10 29 9 C29 13 27 15 24 16 Z" fill="oklch(0.75 0.13 var(--ch) / 0.15)" stroke-width="1.2" />
    {:else if classId === 'hourwarden'}
      <!-- the borrowed second: an hourglass mid-pour -->
      <path d="M15 8 H33 M15 40 H33" />
      <path d="M17 8 C17 17 22 20 24 24 C22 28 17 31 17 40" />
      <path d="M31 8 C31 17 26 20 24 24 C26 28 31 31 31 40" />
      <path d="M21 13 H27 L24 19 Z" fill="oklch(0.75 0.13 var(--ch) / 0.2)" stroke-width="1" />
      <path d="M20 37 H28 L24 31 Z" fill="oklch(0.75 0.13 var(--ch) / 0.2)" stroke-width="1" />
      <circle cx="24" cy="26.5" r="0.9" fill="currentColor" stroke="none" />
    {:else if classId === 'cartomancer'}
      <!-- the fifty-third card: a fanned hand, star up -->
      <g transform="rotate(-16 24 34)" opacity="0.55">
        <rect x="17" y="12" width="14" height="21" rx="2" />
      </g>
      <g transform="rotate(16 24 34)" opacity="0.55">
        <rect x="17" y="12" width="14" height="21" rx="2" />
      </g>
      <rect x="17" y="10" width="14" height="22" rx="2" fill="oklch(0.75 0.13 var(--ch) / 0.1)" />
      <path d="M24 15 L25.6 19 L29.5 19.3 L26.5 21.8 L27.5 25.6 L24 23.4 L20.5 25.6 L21.5 21.8 L18.5 19.3 L22.4 19 Z" stroke-width="1.1" />
    {:else if classId === 'thornspeaker'}
      <!-- the patient green: a briar coil and one honest leaf -->
      <path d="M24 42 C24 34 24 28 24 22 C24 14 30 10 36 12 C34 18 29 20 24 20" />
      <path d="M24 30 C18 30 13 26 14 19 C20 19 24 23 24 28" fill="oklch(0.75 0.13 var(--ch) / 0.1)" />
      <path d="M20 36 L17 34 M28 32 L31 30 M21 26 L18.5 24" stroke-width="1.3" opacity="0.8" />
      <circle cx="36" cy="12" r="1.1" fill="currentColor" stroke="none" />
    {:else}
      <!-- riftblade: a sword interrupted by the elsewhere -->
      <path d="M24 4 L27 8 L26.4 20 L21.6 20 L21 8 Z" fill="oklch(0.75 0.13 var(--ch) / 0.12)" />
      <path d="M22.4 27 L25.6 27 L25 38 L24 42 L23 38 Z" fill="oklch(0.75 0.13 var(--ch) / 0.12)" />
      <path d="M15 24.5 H21 M27 22.5 H33" stroke-width="1.6" />
      <path d="M18 21 C21 22.5 27 21.5 30 23 M18 26 C21 24.5 27 25.5 30 26.5" stroke-width="0.9" opacity="0.6" />
      <circle cx="24" cy="44.5" r="1.3" opacity="0.85" />
    {/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    color: oklch(0.8 0.12 var(--ch));
    filter: drop-shadow(0 0 6px oklch(0.75 0.14 var(--ch) / 0.45));
  }

  svg.dim {
    color: oklch(0.62 0.05 var(--ch));
    filter: none;
    opacity: 0.8;
  }
</style>
