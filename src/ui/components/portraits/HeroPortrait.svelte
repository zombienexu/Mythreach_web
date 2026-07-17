<!-- Duotone line-art hooded mage, ether glow — alive at idle: the chest
     rises, the eyes bank and flare, and a focus-shard turns above the hood. -->
<svg viewBox="0 0 96 96" role="img" aria-label="Hero portrait">
  <g class="body">
    <g stroke="oklch(0.82 0.09 195)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <!-- cloak / shoulders -->
      <path d="M16 86 C20 66 32 58 48 58 C64 58 76 66 80 86" fill="oklch(0.8 0.11 195 / 0.07)" />
      <!-- hood -->
      <path
        d="M48 10 C31 10 24 27 26 42 C27.5 52 36 58 48 58 C60 58 68.5 52 70 42 C72 27 65 10 48 10 Z"
        fill="oklch(0.8 0.11 195 / 0.05)"
      />
      <!-- hood crease -->
      <path d="M48 10 C45.6 18 45.6 25 48 31" stroke-opacity="0.55" stroke-width="1.8" />
      <!-- clasp -->
      <path d="M43 63 L48 68 L53 63" stroke-opacity="0.7" stroke-width="1.8" />
      <!-- gilt hem: the observatory's one concession to vanity -->
      <path d="M22 80 C30 72 40 68 48 68 C56 68 66 72 74 80" stroke="oklch(0.78 0.1 85 / 0.45)" stroke-width="1.3" />
    </g>
    <!-- face void -->
    <ellipse cx="48" cy="41" rx="13" ry="15" fill="oklch(0.1 0.025 280)" />
    <!-- eyes -->
    <g class="iris" fill="oklch(0.88 0.1 195)">
      <circle cx="42.5" cy="41" r="2.1" />
      <circle cx="53.5" cy="41" r="2.1" />
    </g>
    <g class="iris-halo" fill="oklch(0.8 0.11 195 / 0.35)">
      <circle cx="42.5" cy="41" r="4.4" />
      <circle cx="53.5" cy="41" r="4.4" />
    </g>
  </g>

  <!-- the focus: a shard of starlight that never quite settles -->
  <g class="focus">
    <path d="M48 -1 L51 4 L48 9 L45 4 Z" fill="oklch(0.85 0.1 195 / 0.9)" />
    <path d="M48 -1 L51 4 L48 9 L45 4 Z" fill="none" stroke="oklch(0.78 0.1 85 / 0.5)" stroke-width="0.7" />
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 9px oklch(0.8 0.11 195 / 0.4));
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
    filter: drop-shadow(0 0 5px oklch(0.85 0.11 195 / 0.8));
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
