<!-- The Reach Sigil: an astrolabe of gilt rings over the title. The outer
     ring inscribes itself on arrival, the rune-ring and the octagram turn
     against each other on very long clocks, one mote keeps its orbit, and
     the heart-star breathes. Pure ornament, maximum ceremony. -->
<svg viewBox="0 0 220 220" aria-hidden="true">
  <defs>
    <radialGradient id="sigil-heart" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="oklch(0.82 0.11 85 / 0.28)" />
      <stop offset="60%" stop-color="oklch(0.7 0.1 85 / 0.06)" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>

  <!-- hearth-light behind everything -->
  <circle cx="110" cy="110" r="104" fill="url(#sigil-heart)" />

  <!-- outer ring, drawing itself into being -->
  <circle class="draw" cx="110" cy="110" r="100" fill="none" stroke="oklch(0.78 0.1 85 / 0.55)" stroke-width="1.2" />

  <!-- degree ticks, like the rim of an instrument -->
  <circle
    cx="110"
    cy="110"
    r="96"
    fill="none"
    stroke="oklch(0.78 0.1 85 / 0.35)"
    stroke-width="5"
    stroke-dasharray="1 7.38"
  />

  <!-- rune ring: uneven dashes, reading as script from far away -->
  <g class="runes">
    <circle
      cx="110"
      cy="110"
      r="82"
      fill="none"
      stroke="oklch(0.8 0.1 85 / 0.4)"
      stroke-width="2"
      stroke-dasharray="11 6 2 6 15 5 3 7"
    />
  </g>

  <!-- the octagram: two squares, patient and contrary -->
  <g class="octagram" fill="none" stroke="oklch(0.8 0.11 195 / 0.4)" stroke-width="1.1">
    <path d="M110 48 L172 110 L110 172 L48 110 Z" />
    <path d="M66.2 66.2 L153.8 66.2 L153.8 153.8 L66.2 153.8 Z" />
    <circle cx="110" cy="110" r="62" stroke="oklch(0.8 0.11 195 / 0.18)" stroke-width="0.8" />
  </g>

  <!-- the heart: an eight-point star over a quiet iris -->
  <g class="heart">
    <circle cx="110" cy="110" r="30" fill="none" stroke="oklch(0.78 0.1 85 / 0.5)" stroke-width="1" />
    <path
      d="M110 86 L114 106 L134 110 L114 114 L110 134 L106 114 L86 110 L106 106 Z"
      fill="oklch(0.85 0.1 85 / 0.9)"
    />
    <path
      d="M110 96 L122 98 L124 110 L122 122 L110 124 L98 122 L96 110 L98 98 Z"
      fill="none"
      stroke="oklch(0.8 0.11 195 / 0.5)"
      stroke-width="0.8"
    />
  </g>

  <!-- one mote, keeping its appointment -->
  <g class="orbit">
    <circle cx="110" cy="14" r="2.4" fill="oklch(0.85 0.11 195)" />
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 18px oklch(0.75 0.1 85 / 0.25));
  }

  .draw {
    stroke-dasharray: 629;
    stroke-dashoffset: 0;
    animation: sigil-draw 2.6s var(--ease-out-expo) both;
  }

  .runes {
    animation: turn 150s linear infinite;
    transform-origin: 110px 110px;
  }

  .octagram {
    animation: turn 240s linear infinite reverse;
    transform-origin: 110px 110px;
  }

  .heart {
    animation: heart-breathe 5.4s ease-in-out infinite;
    transform-origin: 110px 110px;
  }

  .orbit {
    animation: turn 34s linear infinite;
    transform-origin: 110px 110px;
  }

  .orbit circle {
    filter: drop-shadow(0 0 6px oklch(0.8 0.12 195 / 0.9));
  }

  @keyframes sigil-draw {
    from {
      stroke-dashoffset: 629;
    }
  }

  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes heart-breathe {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.92;
    }
    50% {
      transform: scale(1.045);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .draw,
    .runes,
    .octagram,
    .heart,
    .orbit {
      animation: none;
    }
  }
</style>
