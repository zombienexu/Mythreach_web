<!-- The living void: drifting light blobs + a whisper of star noise. -->
<div class="void" aria-hidden="true">
  <div class="blob ether"></div>
  <div class="blob arcana"></div>
  <div class="blob deep"></div>
  <div class="stars"></div>
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

  .ether {
    top: -22vmax;
    left: -14vmax;
    background: radial-gradient(circle, oklch(0.8 0.11 195 / 0.09) 0%, transparent 62%);
    animation: drift-a 76s ease-in-out infinite alternate;
  }

  .arcana {
    bottom: -26vmax;
    right: -16vmax;
    background: radial-gradient(circle, oklch(0.72 0.15 300 / 0.08) 0%, transparent 62%);
    animation: drift-b 88s ease-in-out infinite alternate;
  }

  .deep {
    top: 30%;
    left: 46%;
    width: 44vmax;
    height: 44vmax;
    background: radial-gradient(circle, oklch(0.55 0.1 255 / 0.06) 0%, transparent 60%);
    animation: drift-c 64s ease-in-out infinite alternate;
  }

  .stars {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.05;
  }

  @keyframes drift-a {
    to {
      transform: translate(9vmax, 6vmax) scale(1.12);
    }
  }
  @keyframes drift-b {
    to {
      transform: translate(-8vmax, -7vmax) scale(1.08);
    }
  }
  @keyframes drift-c {
    to {
      transform: translate(-6vmax, 5vmax) scale(0.92);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blob {
      animation: none;
    }
  }
</style>
