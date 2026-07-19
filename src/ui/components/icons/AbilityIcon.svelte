<script lang="ts">
  import type { AbilityId } from '../../../engine'

  let { id }: { id: AbilityId } = $props()
</script>

<!-- Same line-art language as the portraits: 2px strokes, round caps.
     One glyph per ability, grouped by calling. -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if id === 'fireball'}
    <!-- blazing orb, detached speed-lines behind -->
    <circle cx="15.5" cy="8.5" r="4.7" fill="currentColor" fill-opacity="0.16" />
    <path d="M13 7.2 a3.2 3.2 0 0 1 2.6 -1.4" opacity="0.7" stroke-width="1.5" />
    <path d="M9.4 14.6 L4.4 19.6" />
    <path d="M12.8 17.4 L9.8 20.4" opacity="0.55" />
    <path d="M6.4 11.6 L3.4 14.6" opacity="0.55" />
  {:else if id === 'detonate'}
    <!-- a spark going off: burst of rays from a hot core -->
    <circle cx="12" cy="12" r="2.6" fill="currentColor" fill-opacity="0.24" />
    <path d="M12 2.6 v3.4 M12 18 v3.4 M2.6 12 h3.4 M18 12 h3.4" />
    <path d="M5.2 5.2 l2.4 2.4 M16.4 16.4 l2.4 2.4 M18.8 5.2 l-2.4 2.4 M7.6 16.4 l-2.4 2.4" opacity="0.6" stroke-width="1.6" />
  {:else if id === 'kindle'}
    <!-- a single ember catching -->
    <path
      d="M12 4.2 C10 7.4 8.6 9 8.6 12 a3.4 3.4 0 0 0 6.8 0 C15.4 9 14 7.4 12 4.2 Z"
      fill="currentColor"
      fill-opacity="0.18"
    />
    <path d="M12 11 c-.8 1 -1 1.7 -.6 2.7" opacity="0.7" stroke-width="1.5" />
  {:else if id === 'wildfire'}
    <!-- three flames spreading along a line -->
    <path d="M4 20 H20" opacity="0.5" />
    <path d="M7 19.4 C6 17.6 6.6 16.4 7.3 15 C7.9 16.2 8.6 16.6 8.4 18 A1.2 1.2 0 0 1 7 19.4 Z" fill="currentColor" fill-opacity="0.18" />
    <path d="M12 19.4 C10.4 16.8 11.3 15 12.2 12.6 C13 14.6 14 15.2 13.7 17.6 A1.7 1.7 0 0 1 12 19.4 Z" fill="currentColor" fill-opacity="0.2" />
    <path d="M17 19.4 C16 17.6 16.6 16.4 17.3 15 C17.9 16.2 18.6 16.6 18.4 18 A1.2 1.2 0 0 1 17 19.4 Z" fill="currentColor" fill-opacity="0.18" />
  {:else if id === 'flashpoint'}
    <!-- a four-point flare tearing open -->
    <path d="M12 2.6 L13.4 10.6 L21.4 12 L13.4 13.4 L12 21.4 L10.6 13.4 L2.6 12 L10.6 10.6 Z" fill="currentColor" fill-opacity="0.16" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  {:else if id === 'inferno'}
    <!-- a great flame wreathed in rays -->
    <path
      d="M12 3 C9.2 7.2 7 9.4 7 13 a5 5 0 0 0 10 0 C17 9.4 14.8 7.2 12 3 Z"
      fill="currentColor"
      fill-opacity="0.2"
    />
    <path d="M12 11 c-1.1 1.3 -1.4 2.3 -.8 3.7" opacity="0.7" stroke-width="1.5" />
    <path d="M3.4 6 l1.8 1 M20.6 6 l-1.8 1 M2.8 12.4 l2 .2 M21.2 12.4 l-2 .2" opacity="0.5" stroke-width="1.5" />

    <!-- ── gravewright ── -->
  {:else if id === 'gravebolt'}
    <!-- a thrown drop of ink, falling hard -->
    <path d="M15.8 6.2 C18 8.4 18.6 11 17 13.2 a4.4 4.4 0 0 1 -6.8 -0.4 C8.9 10.5 10.4 8 15.8 6.2 Z" fill="currentColor" fill-opacity="0.18" />
    <path d="M8.4 15.6 L4 20" />
    <path d="M11.6 17.8 L9 20.4" opacity="0.55" />
  {:else if id === 'gravechill'}
    <!-- cold sinking into the marrow, chevron by chevron -->
    <path d="M6.5 5 L12 9 L17.5 5" />
    <path d="M6.5 10 L12 14 L17.5 10" opacity="0.7" />
    <path d="M6.5 15 L12 19 L17.5 15" opacity="0.4" />
  {:else if id === 'lastRites'}
    <!-- a torn ledger page, still beating -->
    <path d="M6.5 3.5 H15 L17.5 6 V17 L14 20.5 H6.5 Z" fill="currentColor" fill-opacity="0.1" />
    <path d="M17.5 17 L14 17 L14 20.5" opacity="0.6" stroke-width="1.6" />
    <path d="M8.5 11 h2 l1.2 -2.4 l1.6 4.4 l1.2 -2 h1" stroke-width="1.6" />
  {:else if id === 'exhume'}
    <!-- a headstone giving its tenant back -->
    <path d="M7 20 V9.5 A5 4.8 0 0 1 17 9.5 V20" fill="currentColor" fill-opacity="0.1" />
    <path d="M4.5 20 H19.5" />
    <path d="M12 15.5 C10.8 13.6 12.9 12.6 12 10.4" opacity="0.7" stroke-width="1.6" />
    <circle cx="12" cy="8.6" r="0.9" fill="currentColor" stroke="none" />
  {:else if id === 'requiem'}
    <!-- the book of the fallen, read aloud -->
    <path d="M4 17.5 C6.6 16.2 9.4 16.2 12 17.5 C14.6 16.2 17.4 16.2 20 17.5 V6 C17.4 4.7 14.6 4.7 12 6 C9.4 4.7 6.6 4.7 4 6 Z" fill="currentColor" fill-opacity="0.1" />
    <path d="M12 6 V17.5" opacity="0.6" stroke-width="1.6" />
    <path d="M8 2.6 v1.8 M12 1.6 v1.6 M16 2.6 v1.8" opacity="0.6" stroke-width="1.6" />
  {:else if id === 'boneward'}
    <!-- a shield of crossed bones -->
    <path d="M12 3.6 C14.6 5.4 17 6.2 19.2 6.4 C19.2 12.8 16.8 17.8 12 20.4 C7.2 17.8 4.8 12.8 4.8 6.4 C7 6.2 9.4 5.4 12 3.6 Z" fill="currentColor" fill-opacity="0.1" />
    <path d="M9 8.5 L15 15.5 M15 8.5 L9 15.5" opacity="0.75" stroke-width="1.7" />
  {:else if id === 'finalChapter'}
    <!-- the ledger slammed shut, hard enough to spark -->
    <path d="M7 4 H16.5 A1.5 1.5 0 0 1 18 5.5 V18.5 A1.5 1.5 0 0 1 16.5 20 H7 Z" fill="currentColor" fill-opacity="0.12" />
    <path d="M7 4 V20 M7 6.5 H5.6 M7 17.5 H5.6" opacity="0.7" stroke-width="1.6" />
    <path d="M20.8 8.2 l1.6 -1.6 M21.4 12 h2 M20.8 15.8 l1.6 1.6" opacity="0.8" stroke-width="1.6" />

    <!-- ── hourwarden ── -->
  {:else if id === 'secondhandStrike'}
    <!-- the second hand, weaponized -->
    <circle cx="12" cy="12" r="7.6" fill="currentColor" fill-opacity="0.08" />
    <path d="M12 12 L16.8 7.2" stroke-width="2.2" />
    <path d="M12 12 L9.4 14.6" opacity="0.55" stroke-width="1.6" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  {:else if id === 'rewindWound'}
    <!-- time, asked politely to reconsider -->
    <path d="M18.6 8.6 A7.4 7.4 0 1 0 19.4 13.6" />
    <path d="M18.9 4.4 L18.6 8.6 L14.4 8.3" />
  {:else if id === 'splitSecond'}
    <!-- one moment, cleaved -->
    <path d="M10.4 3.6 L5.4 12.4 H10 L8.2 20.4 L15.2 10.6 H10.8 L13.4 3.6 Z" fill="currentColor" fill-opacity="0.14" />
    <path d="M17.2 5.4 L14.8 9.8 M18.8 9.4 L16.6 13.2" opacity="0.55" stroke-width="1.6" />
  {:else if id === 'stasis'}
    <!-- the hourglass, told to wait -->
    <path d="M8 3.5 H16 M8 20.5 H16 M8.6 3.5 C8.6 8 15.4 8.6 15.4 12 C15.4 15.4 8.6 16 8.6 20.5 M15.4 3.5 C15.4 8 8.6 8.6 8.6 12 C8.6 15.4 15.4 16 15.4 20.5" fill="none" />
    <path d="M20.5 9.5 v5 M23 9.5 v5" opacity="0" />
    <path d="M11 11 v2 M13 11 v2" stroke-width="1.7" opacity="0.85" />
  {:else if id === 'borrowedBlade'}
    <!-- next Tuesday's knife, spent today -->
    <path d="M12 3 L14 5.5 L12.6 15 H11.4 L10 5.5 Z" fill="currentColor" fill-opacity="0.14" />
    <path d="M8.5 16.5 H15.5" />
    <circle cx="12" cy="19" r="1.8" fill="currentColor" fill-opacity="0.15" />
    <path d="M12 19 L12.9 18.1" stroke-width="1.4" opacity="0.8" />
  {:else if id === 'hourglassShatter'}
    <!-- every grain at once -->
    <path d="M8.6 4.5 C8.6 8.4 14.4 9 14.4 12 C14.4 15 8.6 15.6 8.6 19.5 M14.4 4.5 C14.4 8.4 8.6 9 8.6 12 C8.6 15 14.4 15.6 14.4 19.5" opacity="0.9" />
    <path d="M7.6 4.5 H15.4 M7.6 19.5 H15.4" />
    <path d="M18.2 7 l2.4 -2 M19 12 h2.6 M18.2 17 l2.4 2" stroke-width="1.6" opacity="0.8" />

    <!-- ── cartomancer ── -->
  {:else if id === 'cardflick'}
    <!-- one card, thrown edge-first -->
    <rect x="9" y="4.5" width="9.5" height="13.5" rx="1.4" transform="rotate(12 13.75 11.25)" fill="currentColor" fill-opacity="0.12" />
    <path d="M6.4 13.4 L3.2 15.4 M7.4 17 L4.8 19" opacity="0.55" />
  {:else if id === 'dealFate'}
    <!-- the top card, face up at last -->
    <rect x="7" y="3.8" width="10.5" height="15.5" rx="1.6" fill="currentColor" fill-opacity="0.12" />
    <path d="M12.2 8 L13.3 10.6 L16 10.9 L14 12.8 L14.6 15.5 L12.2 14.1 L9.8 15.5 L10.4 12.8 L8.4 10.9 L11.1 10.6 Z" fill="currentColor" fill-opacity="0.25" stroke-width="1.4" />
  {:else if id === 'cutTheDeck'}
    <!-- the deck, split and reconsidered -->
    <rect x="3.6" y="6.5" width="8" height="11.5" rx="1.3" fill="currentColor" fill-opacity="0.12" />
    <rect x="13" y="5" width="8" height="11.5" rx="1.3" transform="rotate(8 17 10.75)" fill="currentColor" fill-opacity="0.08" />
    <path d="M7.6 20.6 h9" opacity="0.5" />
  {:else if id === 'houseRules'}
    <!-- the die that only rolls sixes -->
    <rect x="5" y="5" width="14" height="14" rx="2.4" fill="currentColor" fill-opacity="0.1" />
    <circle cx="9.2" cy="8.8" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="8.8" r="1" fill="currentColor" stroke="none" />
    <circle cx="9.2" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9.2" cy="15.2" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="15.2" r="1" fill="currentColor" stroke="none" />
  {:else if id === 'foldTheWorld'}
    <!-- the hand — and the world — creased down the middle -->
    <path d="M5 5.5 H12 V18.5 H5 Z" fill="currentColor" fill-opacity="0.14" />
    <path d="M12 5.5 L19.5 8 V16 L12 18.5" fill="currentColor" fill-opacity="0.06" />
    <path d="M12 5.5 V18.5" stroke-width="2.2" />
  {:else if id === 'fiftyThirdCard'}
    <!-- the card that edits the world -->
    <rect x="7.5" y="4.5" width="9" height="13.5" rx="1.5" fill="currentColor" fill-opacity="0.16" />
    <path d="M12 1.4 v1.6 M12 21 v1.6 M2.4 11.2 h1.6 M20 11.2 h1.6 M4.6 3.8 l1.4 1.4 M18 18 l1.4 1.4 M19.4 3.8 L18 5.2 M6 18 L4.6 19.4" opacity="0.75" stroke-width="1.6" />
    <path d="M12 8.4 v5.4 M9.6 11.1 h4.8" stroke-width="1.6" />

    <!-- ── thornspeaker ── -->
  {:else if id === 'thornlash'}
    <!-- a whip of briar, mid-crack -->
    <path d="M4 19.5 C10 19 16.5 15.5 19.5 5.5" />
    <path d="M9.4 18.2 l1.4 1.8 M13.6 15.6 l1.9 1.2 M16.8 11.6 l2 0.8 M18.8 7.6 l2 0.2" stroke-width="1.6" opacity="0.75" />
  {:else if id === 'sowBriar'}
    <!-- a seed with plans -->
    <circle cx="12" cy="17.5" r="2.2" fill="currentColor" fill-opacity="0.2" />
    <path d="M12 15.3 C12 11.5 12 9.5 12 7.5" />
    <path d="M12 11 C10 10.6 8.8 9.2 8.6 7 C10.8 7.2 12 8.6 12 11 Z" fill="currentColor" fill-opacity="0.14" />
    <path d="M12 8.6 C14 8.2 15.2 6.8 15.4 4.6 C13.2 4.8 12 6.2 12 8.6 Z" fill="currentColor" fill-opacity="0.14" />
  {:else if id === 'sapdraw'}
    <!-- their vigor, rerouted -->
    <path d="M12 4.4 C9.6 8 8 10 8 12.8 a4 4 0 0 0 8 0 C16 10 14.4 8 12 4.4 Z" fill="currentColor" fill-opacity="0.16" />
    <path d="M5.5 19.5 l3 -0 M8.5 19.5 L7 18 M8.5 19.5 L7 21" stroke-width="1.6" opacity="0.75" />
    <path d="M18.5 19.5 l-3 0 M15.5 19.5 L17 18 M15.5 19.5 L17 21" stroke-width="1.6" opacity="0.75" />
  {:else if id === 'brambleWard'}
    <!-- a hedge grown shut -->
    <path d="M12 3.6 C14.6 5.4 17 6.2 19.2 6.4 C19.2 12.8 16.8 17.8 12 20.4 C7.2 17.8 4.8 12.8 4.8 6.4 C7 6.2 9.4 5.4 12 3.6 Z" fill="currentColor" fill-opacity="0.1" />
    <path d="M8.4 9 l2 1.6 M15.6 9 l-2 1.6 M8.8 13.4 l1.8 1.2 M15.2 13.4 l-1.8 1.2" stroke-width="1.6" opacity="0.8" />
  {:else if id === 'wildswell'}
    <!-- forced spring -->
    <path d="M12 20.5 V13" />
    <path d="M12 16 C9.6 15.6 8.2 14 8 11.6 C10.6 11.8 12 13.4 12 16 Z" fill="currentColor" fill-opacity="0.14" />
    <path d="M12 13.6 C14.4 13.2 15.8 11.6 16 9.2 C13.4 9.4 12 11 12 13.6 Z" fill="currentColor" fill-opacity="0.14" />
    <circle cx="12" cy="5.4" r="2" fill="currentColor" fill-opacity="0.2" />
    <path d="M12 1.6 v1 M8.6 2.6 l0.7 0.9 M15.4 2.6 l-0.7 0.9" stroke-width="1.4" opacity="0.7" />
  {:else if id === 'verdantCataract'}
    <!-- the whole garden at once -->
    <circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.3" />
    <path d="M12 9.8 C10.8 7.4 11 5.2 12 3.2 C13 5.2 13.2 7.4 12 9.8 Z" fill="currentColor" fill-opacity="0.16" />
    <path d="M12 14.2 C10.8 16.6 11 18.8 12 20.8 C13 18.8 13.2 16.6 12 14.2 Z" fill="currentColor" fill-opacity="0.16" />
    <path d="M9.8 12 C7.4 13.2 5.2 13 3.2 12 C5.2 11 7.4 10.8 9.8 12 Z" fill="currentColor" fill-opacity="0.16" />
    <path d="M14.2 12 C16.6 10.8 18.8 11 20.8 12 C18.8 13 16.6 13.2 14.2 12 Z" fill="currentColor" fill-opacity="0.16" />
    <path d="M7.2 7.2 l1.6 1.6 M16.8 7.2 l-1.6 1.6 M7.2 16.8 l1.6 -1.6 M16.8 16.8 l-1.6 -1.6" opacity="0.5" stroke-width="1.4" />

    <!-- ── riftblade ── -->
  {:else if id === 'throughCut'}
    <!-- the blade arrives before you do -->
    <path d="M10 4 C7 8 7 16 10 20" opacity="0.7" />
    <path d="M14 4 C17 8 17 16 14 20" opacity="0.7" />
    <path d="M4.5 16.5 L19.5 7.5" stroke-width="2.2" />
  {:else if id === 'seamstep'}
    <!-- the seam, stepped through -->
    <path d="M12 3.5 v2.4 M12 8.5 v2.4 M12 13.5 v2.4 M12 18.5 v2" opacity="0.8" />
    <path d="M6.5 8 C8.5 10 8.5 14 6.5 16" opacity="0.55" />
    <path d="M17.5 8 C15.5 10 15.5 14 17.5 16" opacity="0.55" />
  {:else if id === 'phaseEdge'}
    <!-- every charge, one edge -->
    <path d="M5 19 L16.5 4.5 L19.5 7.5 L8 19 Z" fill="currentColor" fill-opacity="0.12" />
    <circle cx="15.2" cy="8.2" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12.8" cy="11" r="0.8" fill="currentColor" stroke="none" opacity="0.75" />
    <circle cx="10.4" cy="13.8" r="0.8" fill="currentColor" stroke="none" opacity="0.5" />
  {:else if id === 'afterimage'}
    <!-- a you-shaped argument -->
    <path d="M9 20 C9 15.5 9.6 12.5 12 12.5 C14.4 12.5 15 15.5 15 20" fill="currentColor" fill-opacity="0.14" />
    <circle cx="12" cy="8.5" r="3" fill="currentColor" fill-opacity="0.14" />
    <path d="M16.6 19.4 C16.6 15.8 17 13.4 18.9 13.2 M18 9.9 a2.4 2.4 0 0 0 1.4 -3.6" opacity="0.45" stroke-width="1.6" />
  {:else if id === 'riftTear'}
    <!-- the seam, opened wide -->
    <path d="M12 2.5 L10 8 L13.5 11 L10.5 14.5 L13 17.5 L11 21.5" stroke-width="2.2" />
    <path d="M5.6 8.4 l2.2 1.4 M4.4 13.6 l2.4 0.4 M19 7 l-2.4 1.4 M20 13 l-2.6 0.6" opacity="0.55" stroke-width="1.5" />
  {:else}
    <!-- doorwayDuel: a door only two fit through -->
    <path d="M6 20.5 V10 A6 6.5 0 0 1 18 10 V20.5" fill="currentColor" fill-opacity="0.1" />
    <path d="M3.5 20.5 H20.5" />
    <path d="M9 16.5 L15 10.5 M15 16.5 L9 10.5" stroke-width="1.7" opacity="0.85" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
