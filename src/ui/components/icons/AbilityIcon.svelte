<script lang="ts">
  import type { AbilityId } from '../../../engine'

  let { id }: { id: AbilityId } = $props()
</script>

<!-- Same line-art language as the portraits: 2px strokes, round caps. -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if id === 'fireball'}
    <!-- blazing orb, detached speed-lines behind -->
    <circle cx="15.5" cy="8.5" r="4.7" fill="currentColor" fill-opacity="0.16" />
    <path d="M13 7.2 a3.2 3.2 0 0 1 2.6 -1.4" opacity="0.7" stroke-width="1.5" />
    <path d="M9.4 14.6 L4.4 19.6" />
    <path d="M12.8 17.4 L9.8 20.4" opacity="0.55" />
    <path d="M6.4 11.6 L3.4 14.6" opacity="0.55" />
  {:else if id === 'ignite'}
    <!-- flame catching on a surface -->
    <path
      d="M12 4.4 C10.1 7.6 8.4 9.2 8.4 12.2 a3.6 3.6 0 0 0 7.2 0 C15.6 9.2 13.9 7.6 12 4.4 Z"
      fill="currentColor"
      fill-opacity="0.16"
    />
    <path d="M4.5 19.6 H19.5" />
    <path d="M12 11 c-.9 1 -1.1 1.8 -.7 2.9" opacity="0.7" stroke-width="1.5" />
  {:else if id === 'renew'}
    <!-- renewal bloom -->
    <path
      d="M12 3.4 C12.9 8.2 15.8 11.1 20.6 12 C15.8 12.9 12.9 15.8 12 20.6 C11.1 15.8 8.2 12.9 3.4 12 C8.2 11.1 11.1 8.2 12 3.4 Z"
      fill="currentColor"
      fill-opacity="0.14"
    />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  {:else if id === 'pyroblast'}
    <!-- falling comet with a long tail -->
    <circle cx="16.2" cy="16.2" r="4.2" fill="currentColor" fill-opacity="0.18" />
    <path d="M12.6 12.6 L4 4" />
    <path d="M15.4 9.8 L10.2 4.6" opacity="0.55" />
    <path d="M9.8 15.4 L4.6 10.2" opacity="0.55" />
  {:else if id === 'counterspell'}
    <!-- spell sigil, struck through -->
    <circle cx="12" cy="12" r="6.4" fill="currentColor" fill-opacity="0.1" />
    <path d="M12 5.6 v2.2 M12 16.2 v2.2 M5.6 12 h2.2 M16.2 12 h2.2" opacity="0.6" stroke-width="1.6" />
    <path d="M5.4 18.6 L18.6 5.4" />
  {:else if id === 'barrier'}
    <!-- rounded shield of glass -->
    <path
      d="M12 3.6 C14.6 5.4 17 6.2 19.2 6.4 C19.2 12.8 16.8 17.8 12 20.4 C7.2 17.8 4.8 12.8 4.8 6.4 C7 6.2 9.4 5.4 12 3.6 Z"
      fill="currentColor"
      fill-opacity="0.12"
    />
    <path d="M12 7.4 v6" opacity="0.65" stroke-width="1.6" />
    <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
  {:else}
    <!-- combustion: a sun going critical -->
    <circle cx="12" cy="12" r="3.4" fill="currentColor" fill-opacity="0.2" />
    <path d="M12 3.2 v3 M12 17.8 v3 M3.2 12 h3 M17.8 12 h3" />
    <path d="M5.8 5.8 l2.1 2.1 M16.1 16.1 l2.1 2.1 M18.2 5.8 l-2.1 2.1 M7.9 16.1 l-2.1 2.1" opacity="0.6" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
