<script lang="ts">
  import type { PortraitFamily } from '../../../engine'

  let {
    family,
    hue,
    name,
    enraged = false,
  }: {
    family: PortraitFamily
    hue: number
    name: string
    enraged?: boolean
  } = $props()
</script>

<!-- One duotone line-art glyph per family; the zone/creature hue drives the ink.
     Eyes flare wound-red when enraged. -->
<svg
  viewBox="0 0 96 96"
  role="img"
  aria-label="{name} portrait"
  style:color="oklch(0.72 0.09 {hue})"
  style:--eye={enraged ? 'oklch(0.72 0.19 25)' : `oklch(0.82 0.13 ${hue})`}
  class="fam-{family}"
  class:enraged
>
  <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
    {#if family === 'golem'}
      <path d="M8 86 L16 62 L30 54 L38 60 L38 86" fill="currentColor" fill-opacity="0.05" />
      <path d="M88 86 L80 62 L66 54 L58 60 L58 86" fill="currentColor" fill-opacity="0.05" />
      <path d="M31 20 L65 16 L74 38 L63 52 L34 54 L23 40 Z" fill="currentColor" fill-opacity="0.05" />
      <path d="M30 33 L48 30 L67 31" stroke-width="2" />
      <path d="M56 17 L53 26 L58 32" stroke-width="1.6" stroke-opacity="0.6" />
      <path d="M28 60 L33 68 L30 76" stroke-width="1.6" stroke-opacity="0.6" />
    {:else if family === 'beast'}
      <!-- low predator, ears back -->
      <path d="M14 78 C16 60 26 48 44 46 L70 44 C80 44 86 52 86 62 L86 78" fill="currentColor" fill-opacity="0.05" />
      <path d="M64 44 L58 26 L72 36 Z" fill="currentColor" fill-opacity="0.08" />
      <path d="M82 46 L88 30 L74 38" stroke-opacity="0.7" />
      <path d="M40 58 C36 62 34 68 35 74" stroke-opacity="0.55" stroke-width="1.8" />
      <path d="M56 56 L64 64 M66 54 L72 60" stroke-opacity="0.5" stroke-width="1.6" />
      <path d="M70 62 L64 66 L70 68" stroke-width="2" />
    {:else if family === 'spider'}
      <!-- hanging orb-weaver -->
      <path d="M48 4 V22" stroke-opacity="0.5" stroke-width="1.6" />
      <ellipse cx="48" cy="40" rx="14" ry="12" fill="currentColor" fill-opacity="0.06" />
      <ellipse cx="48" cy="62" rx="18" ry="16" fill="currentColor" fill-opacity="0.05" />
      <path d="M36 34 L18 24 M34 42 L12 42 M36 50 L16 62" stroke-opacity="0.75" />
      <path d="M60 34 L78 24 M62 42 L84 42 M60 50 L80 62" stroke-opacity="0.75" />
      <path d="M42 66 C44 70 52 70 54 66" stroke-opacity="0.5" stroke-width="1.8" />
    {:else if family === 'wisp'}
      <!-- unraveling spirit flame -->
      <path d="M48 12 C60 22 66 34 66 48 a18 18 0 0 1 -36 0 C30 34 36 22 48 12 Z" fill="currentColor" fill-opacity="0.07" />
      <path d="M48 24 C54 32 57 40 57 48 a9 9 0 0 1 -18 0 C39 40 42 32 48 24 Z" stroke-opacity="0.6" stroke-width="1.8" />
      <path d="M30 70 C34 76 42 80 48 80 C54 80 62 76 66 70" stroke-opacity="0.4" stroke-width="1.6" />
      <path d="M22 56 C18 60 16 66 17 72 M74 56 C78 60 80 66 79 72" stroke-opacity="0.45" stroke-width="1.6" />
    {:else if family === 'drake'}
      <!-- horned wyrm head in profile -->
      <path d="M18 62 C22 44 34 34 52 34 L78 40 L64 50 L70 58 L52 60 C40 62 32 68 28 78 Z" fill="currentColor" fill-opacity="0.06" />
      <path d="M52 34 C50 24 42 18 32 16 L44 30" stroke-opacity="0.8" />
      <path d="M64 30 C66 22 62 14 56 10 L58 26" stroke-opacity="0.6" />
      <path d="M78 40 L88 44 M64 50 L70 58" stroke-opacity="0.7" stroke-width="2" />
      <path d="M34 70 L26 86 M46 66 L44 84" stroke-opacity="0.5" stroke-width="1.8" />
    {:else if family === 'revenant'}
      <!-- shrouded husk, torn hem -->
      <path d="M48 10 C34 10 27 24 29 38 C30 47 36 53 44 55 L40 86 L48 76 L56 86 L52 55 C60 53 66 47 67 38 C69 24 62 10 48 10 Z" fill="currentColor" fill-opacity="0.05" />
      <path d="M48 10 C45.6 18 45.6 25 48 31" stroke-opacity="0.5" stroke-width="1.8" />
      <path d="M30 62 L20 70 M66 62 L76 70" stroke-opacity="0.45" stroke-width="1.8" />
    {:else if family === 'titan'}
      <!-- horned mountain of a torso -->
      <path d="M12 86 L20 56 L34 48 L48 52 L62 48 L76 56 L84 86" fill="currentColor" fill-opacity="0.05" />
      <path d="M34 48 L30 20 L44 36 M62 48 L66 20 L52 36" fill="currentColor" fill-opacity="0.07" />
      <path d="M34 48 L38 30 L48 44 L58 30 L62 48 L48 54 Z" fill="currentColor" fill-opacity="0.06" />
      <path d="M26 66 L34 72 M70 66 L62 72" stroke-opacity="0.5" stroke-width="1.8" />
    {:else}
      <!-- void: geometry that should not close -->
      <path d="M48 10 L78 34 L66 76 L30 76 L18 34 Z" fill="currentColor" fill-opacity="0.05" />
      <path d="M48 10 L48 40 M78 34 L52 46 M66 76 L50 52 M30 76 L44 52 M18 34 L42 46" stroke-opacity="0.45" stroke-width="1.6" />
      <circle cx="48" cy="46" r="8" fill="currentColor" fill-opacity="0.1" />
      <path d="M28 22 L20 14 M68 22 L76 14" stroke-opacity="0.5" stroke-width="1.8" />
    {/if}
  </g>

  <!-- eyes, shared language: paired embers -->
  <g class="eyes" fill="var(--eye)">
    {#if family === 'spider'}
      <circle cx="43" cy="38" r="2" />
      <circle cx="53" cy="38" r="2" />
      <circle cx="47" cy="33" r="1.3" />
      <circle cx="49" cy="43" r="1.3" />
    {:else if family === 'wisp'}
      <circle cx="48" cy="46" r="2.6" />
    {:else if family === 'drake'}
      <circle cx="58" cy="43" r="2.2" />
    {:else if family === 'void'}
      <circle cx="44" cy="44" r="2" />
      <circle cx="52" cy="48" r="2" />
    {:else}
      <circle cx="42" cy="40" r="2.2" />
      <circle cx="54" cy="40" r="2.2" />
    {/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 9px color-mix(in oklch, currentColor 40%, transparent));
    transition: filter var(--dur) ease;
  }

  svg.enraged {
    filter: drop-shadow(0 0 12px oklch(0.68 0.17 25 / 0.55));
  }

  .eyes {
    filter: drop-shadow(0 0 4px var(--eye));
    animation: eye-smoulder 3.4s ease-in-out infinite alternate;
  }

  /* ---- Idle life ----------------------------------------------------
     Nothing on the field is a statue. Each family idles in its own way;
     enrage doubles the tempo of whatever the body was already doing. */
  svg.fam-golem,
  svg.fam-titan {
    animation: heave 5.6s ease-in-out infinite;
    transform-origin: 50% 92%;
  }

  svg.fam-beast,
  svg.fam-drake {
    animation: breathe 3.8s ease-in-out infinite;
    transform-origin: 50% 80%;
  }

  svg.fam-spider {
    animation: dangle 4.6s ease-in-out infinite;
  }

  svg.fam-wisp {
    animation: guttering 3s ease-in-out infinite;
  }

  svg.fam-revenant,
  svg.fam-void {
    animation: drift-idle 6.4s ease-in-out infinite;
  }

  svg.enraged {
    animation-duration: 1.9s;
  }

  @keyframes heave {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.008, 1.022);
    }
  }

  @keyframes breathe {
    0%,
    100% {
      transform: scale(1) translateY(0);
    }
    50% {
      transform: scale(1.015) translateY(-0.7px);
    }
  }

  @keyframes dangle {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2.2px);
    }
  }

  @keyframes guttering {
    0%,
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    38% {
      transform: scale(0.99, 1.03) translateY(-1.4px);
      opacity: 0.88;
    }
    62% {
      opacity: 1;
    }
    74% {
      opacity: 0.93;
    }
  }

  @keyframes drift-idle {
    0%,
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
    33% {
      transform: translate(0.8px, -1.6px) rotate(0.5deg);
    }
    66% {
      transform: translate(-0.8px, -0.6px) rotate(-0.5deg);
    }
  }

  @keyframes eye-smoulder {
    from {
      opacity: 0.78;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg,
    .eyes {
      animation: none;
    }
  }
</style>
