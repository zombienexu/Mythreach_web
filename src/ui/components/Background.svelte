<!-- The candlelit atlas: a night sky of drifting light, a star-chart of
     constellations, and a scatter of fireflies in the lower dark. -->
<div class="void" aria-hidden="true">
  <div class="blob candle"></div>
  <div class="blob arcana"></div>
  <div class="constellations"></div>
  <div class="stars"></div>
  {#each Array.from({ length: 6 }) as _, i (i)}
    <span class="firefly ff{i}"></span>
  {/each}
</div>

<style>
  .void {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: radial-gradient(120% 90% at 70% -10%, var(--void) 40%, var(--void-deep) 100%);
  }

  .blob {
    position: absolute;
    width: 60vmax;
    height: 60vmax;
    border-radius: 50%;
    will-change: transform;
  }

  /* Bottom glow: candle-gold, like a lamp under the map. */
  .candle {
    bottom: -26vmax;
    left: -12vmax;
    background: radial-gradient(circle, oklch(0.75 0.1 80 / 0.07) 0%, transparent 62%);
    animation: drift-a 82s ease-in-out infinite alternate;
  }

  .arcana {
    top: -22vmax;
    right: -16vmax;
    background: radial-gradient(circle, oklch(0.72 0.15 300 / 0.08) 0%, transparent 62%);
    animation: drift-b 88s ease-in-out infinite alternate;
  }

  /* Star-figures, dots joined by thin gilt lines, tiled faintly across the sky. */
  .constellations {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cg fill='none' stroke='%23d8b96a' stroke-width='1'%3E%3Cpolyline points='60,80 110,60 150,110 130,170 80,150'/%3E%3Cpolyline points='300,70 360,90 400,60 430,120'/%3E%3Cpolyline points='210,300 260,340 240,400 300,420 340,370'/%3E%3C/g%3E%3Cg fill='%23d8b96a'%3E%3Ccircle cx='60' cy='80' r='2'/%3E%3Ccircle cx='110' cy='60' r='2'/%3E%3Ccircle cx='150' cy='110' r='2'/%3E%3Ccircle cx='130' cy='170' r='2'/%3E%3Ccircle cx='80' cy='150' r='2'/%3E%3Ccircle cx='300' cy='70' r='2'/%3E%3Ccircle cx='360' cy='90' r='2'/%3E%3Ccircle cx='400' cy='60' r='2'/%3E%3Ccircle cx='430' cy='120' r='2'/%3E%3Ccircle cx='210' cy='300' r='2'/%3E%3Ccircle cx='260' cy='340' r='2'/%3E%3Ccircle cx='240' cy='400' r='2'/%3E%3Ccircle cx='300' cy='420' r='2'/%3E%3Ccircle cx='340' cy='370' r='2'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 480px 480px;
    opacity: 0.05;
  }

  .stars {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.05;
  }

  /* Fireflies: slow gilt motes drifting and flickering in the lower half. */
  .firefly {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--gilt);
    box-shadow: 0 0 6px var(--gilt);
    opacity: 0;
    will-change: transform, opacity;
  }

  .ff0 { left: 14%; top: 68%; animation: float 13s ease-in-out 0s infinite; }
  .ff1 { left: 32%; top: 82%; animation: float 17s ease-in-out 2s infinite; }
  .ff2 { left: 51%; top: 74%; animation: float 15s ease-in-out 4s infinite; }
  .ff3 { left: 68%; top: 88%; animation: float 19s ease-in-out 1s infinite; }
  .ff4 { left: 79%; top: 66%; animation: float 14s ease-in-out 6s infinite; }
  .ff5 { left: 90%; top: 80%; animation: float 21s ease-in-out 3s infinite; }

  @keyframes drift-a {
    to {
      transform: translate(8vmax, -6vmax) scale(1.1);
    }
  }
  @keyframes drift-b {
    to {
      transform: translate(-8vmax, 7vmax) scale(1.08);
    }
  }
  @keyframes float {
    0% {
      transform: translate(0, 0);
      opacity: 0;
    }
    20% {
      opacity: 0.7;
    }
    50% {
      transform: translate(-14px, -34px);
      opacity: 0.35;
    }
    80% {
      opacity: 0.6;
    }
    100% {
      transform: translate(10px, -68px);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blob,
    .firefly {
      animation: none;
    }
    /* motion-off: let the motes rest, softly lit, where they sit */
    .firefly {
      opacity: 0.4;
    }
  }
</style>
