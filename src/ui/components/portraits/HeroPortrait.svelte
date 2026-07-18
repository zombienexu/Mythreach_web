<script lang="ts">
  import type { ClassId } from '../../../engine'

  let { classId = 'arcanist' }: { classId?: ClassId } = $props()

  /** Each calling's hue — the portrait wears the class everywhere. */
  const HUES: Record<ClassId, number> = {
    arcanist: 195,
    gravewright: 135,
    hourwarden: 240,
    cartomancer: 80,
    thornspeaker: 150,
    riftblade: 305,
  }

  const hue = $derived(HUES[classId])
</script>

<!-- Duotone line-art hooded hero, class-tinted — alive at idle: the chest
     rises, the eyes bank and flare, and the calling's focus turns overhead. -->
<svg viewBox="0 0 96 96" role="img" aria-label="Hero portrait" style:--ph={hue}>
  <g class="body">
    <g class="lines">
      <!-- cloak / shoulders -->
      <path class="cloth" d="M16 86 C20 66 32 58 48 58 C64 58 76 66 80 86" />
      <!-- hood -->
      <path
        class="cloth"
        d="M48 10 C31 10 24 27 26 42 C27.5 52 36 58 48 58 C60 58 68.5 52 70 42 C72 27 65 10 48 10 Z"
      />
      <!-- hood crease -->
      <path class="crease" d="M48 10 C45.6 18 45.6 25 48 31" />
      <!-- clasp -->
      <path class="crease" d="M43 63 L48 68 L53 63" />
      <!-- gilt hem: the observatory's one concession to vanity -->
      <path class="hem" d="M22 80 C30 72 40 68 48 68 C56 68 66 72 74 80" />
    </g>
    <!-- face void -->
    <ellipse cx="48" cy="41" rx="13" ry="15" fill="oklch(0.1 0.025 280)" />
    <!-- eyes -->
    <g class="iris">
      <circle cx="42.5" cy="41" r="2.1" />
      <circle cx="53.5" cy="41" r="2.1" />
    </g>
    <g class="iris-halo">
      <circle cx="42.5" cy="41" r="4.4" />
      <circle cx="53.5" cy="41" r="4.4" />
    </g>
  </g>

  <!-- the focus: each calling carries something different overhead -->
  <g class="focus">
    {#if classId === 'gravewright'}
      <!-- a quill, still wet -->
      <path class="charm" d="M45 8 C46.5 3.5 49.5 1 51.5 0.5 C51 3.5 49.5 6.5 47 8.5 L45.6 8.8 Z" />
      <path class="charm-line" d="M45.6 8.8 L44 10.4" />
    {:else if classId === 'hourwarden'}
      <!-- a minute hourglass, always running -->
      <path class="charm-line" d="M45 0.5 H51 M45 9.5 H51 M45.7 0.5 C45.7 4 50.3 4.4 50.3 5 C50.3 5.6 45.7 6 45.7 9.5 M50.3 0.5 C50.3 4 45.7 4.4 45.7 5 C45.7 5.6 50.3 6 50.3 9.5" />
    {:else if classId === 'cartomancer'}
      <!-- the fifty-third card, face down for now -->
      <rect class="charm" x="45" y="0" width="6" height="9" rx="1" transform="rotate(9 48 4.5)" />
    {:else if classId === 'thornspeaker'}
      <!-- one leaf, patient -->
      <path class="charm" d="M48 0.5 C51.5 2 52.5 5.5 51.5 9 C48 7.5 47 4 48 0.5 Z" />
      <path class="charm-line" d="M49.5 8.6 C49.5 5.6 49.3 3.4 48.6 1.6" />
    {:else if classId === 'riftblade'}
      <!-- the seam-knife, point down -->
      <path class="charm" d="M48 -1 L49.6 3.4 L48 9 L46.4 3.4 Z" />
      <path class="charm-line" d="M45.6 4.6 H50.4" />
    {:else}
      <!-- arcanist: a shard of starlight that never quite settles -->
      <path class="charm" d="M48 -1 L51 4 L48 9 L45 4 Z" />
    {/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 9px oklch(0.8 0.11 var(--ph) / 0.4));
  }

  .lines {
    stroke: oklch(0.82 0.09 var(--ph));
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  .cloth {
    fill: oklch(0.8 0.11 var(--ph) / 0.06);
  }

  .crease {
    stroke-opacity: 0.6;
    stroke-width: 1.8;
  }

  .hem {
    stroke: oklch(0.78 0.1 85 / 0.45);
    stroke-width: 1.3;
  }

  .iris {
    fill: oklch(0.88 0.1 var(--ph));
  }

  .iris-halo {
    fill: oklch(0.8 0.11 var(--ph) / 0.35);
  }

  .charm {
    fill: oklch(0.85 0.1 var(--ph) / 0.9);
    stroke: oklch(0.78 0.1 85 / 0.5);
    stroke-width: 0.7;
  }

  .charm-line {
    fill: none;
    stroke: oklch(0.85 0.1 var(--ph) / 0.9);
    stroke-width: 1;
    stroke-linecap: round;
  }

  .body {
    animation: hero-breathe 4.6s ease-in-out infinite;
    transform-origin: 50% 88%;
  }

  .iris,
  .iris-halo {
    animation: hero-gaze 5.8s ease-in-out infinite;
  }

  .focus {
    filter: drop-shadow(0 0 5px oklch(0.85 0.11 var(--ph) / 0.8));
    animation: focus-hover 3.6s ease-in-out infinite;
    transform-origin: 48px 4px;
  }

  @keyframes hero-breathe {
    0%,
    100% {
      transform: scale(1) translateY(0);
    }
    50% {
      transform: scale(1.012) translateY(-0.6px);
    }
  }

  /* The gaze banks low, then flares — a candle deciding to stay lit. */
  @keyframes hero-gaze {
    0%,
    100% {
      opacity: 1;
    }
    46% {
      opacity: 0.7;
    }
    54% {
      opacity: 1;
    }
    78% {
      opacity: 0.85;
    }
  }

  @keyframes focus-hover {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-2.4px) rotate(180deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .body,
    .iris,
    .iris-halo,
    .focus {
      animation: none;
    }
  }
</style>
