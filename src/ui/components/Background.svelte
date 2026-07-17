<script lang="ts">
  import { fade } from 'svelte/transition'

  /** The candlelit atlas: a night sky that belongs to wherever you are.
   *  The region's hue drives a nebula, an aurora, a horizon glow, and a
   *  weather of drifting motes — travel, and the whole observatory relights. */
  let { hue = 260 }: { hue?: number } = $props()

  /* Weather is read out of the colour itself: warm hues smoulder, greens
   * breathe spores, storm-blues streak and flicker, deep indigo hangs still,
   * violets fall the wrong way. */
  type Mood = 'ember' | 'verdant' | 'storm' | 'cavern' | 'void'
  const mood: Mood = $derived(
    hue >= 15 && hue < 100
      ? 'ember'
      : hue >= 100 && hue < 180
        ? 'verdant'
        : hue >= 180 && hue < 248
          ? 'storm'
          : hue >= 248 && hue < 288
            ? 'cavern'
            : 'void',
  )

  /* One scatter of motes for the whole session; each visit deals new weather. */
  const MOTES = Array.from({ length: 16 }, (_, i) => ({
    i,
    x: Math.random() * 100,
    y: 30 + Math.random() * 65,
    delay: Math.random() * -20,
    dur: 9 + Math.random() * 14,
    scale: 0.6 + Math.random() * 0.9,
    sway: Math.random() * 30 - 15,
  }))
</script>

<div class="sky" aria-hidden="true">
  <!-- Region light: nebula + horizon + aurora, crossfading as you travel. -->
  {#key hue}
    <div class="region" style:--rh={hue} transition:fade={{ duration: 1400 }}>
      <div class="nebula"></div>
      <div class="horizon"></div>
      <div class="aurora"></div>
    </div>
  {/key}

  <!-- The lamp under the map never goes out. -->
  <div class="blob candle"></div>

  <div class="constellations"></div>
  <div class="stars"></div>

  <!-- Weather of the place: motes that rise, drift, streak, hang, or fall upward. -->
  {#key mood}
    <div class="weather {mood}" style:--rh={hue} transition:fade={{ duration: 1600 }}>
      {#if mood === 'storm'}
        <div class="lightning"></div>
      {/if}
      {#each MOTES as m (m.i)}
        <span
          class="mote"
          style:left="{m.x}%"
          style:top="{m.y}%"
          style:--delay="{m.delay}s"
          style:--dur="{m.dur}s"
          style:--scale={m.scale}
          style:--sway="{m.sway}px"
        ></span>
      {/each}
    </div>
  {/key}
</div>

<style>
  .sky {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: radial-gradient(120% 90% at 70% -10%, var(--void) 40%, var(--void-deep) 100%);
  }

  .region,
  .weather {
    position: absolute;
    inset: 0;
  }

  /* The sky over this region: a slow-breathing nebula in the region's ink. */
  .nebula {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(42% 38% at 78% 12%, oklch(0.55 0.13 calc(var(--rh) * 1) / 0.13) 0%, transparent 68%),
      radial-gradient(50% 44% at 12% 78%, oklch(0.5 0.11 calc(var(--rh) * 1) / 0.08) 0%, transparent 70%);
    animation: nebula-breathe 26s ease-in-out infinite alternate;
  }

  @keyframes nebula-breathe {
    to {
      transform: translate(-2%, 2%) scale(1.06);
      opacity: 0.8;
    }
  }

  /* Ground-light where the land would be, holding the page up from below. */
  .horizon {
    position: absolute;
    inset: auto 0 0;
    height: 34vh;
    background: linear-gradient(180deg, transparent, oklch(0.45 0.1 calc(var(--rh) * 1) / 0.09));
  }

  /* A ribbon of thin light leaning across the upper sky. */
  .aurora {
    position: absolute;
    top: -12%;
    left: -30%;
    width: 160%;
    height: 46%;
    background: linear-gradient(
      100deg,
      transparent 20%,
      oklch(0.72 0.11 calc(var(--rh) * 1) / 0.05) 40%,
      oklch(0.8 0.09 calc(var(--rh) * 1 + 40) / 0.04) 55%,
      transparent 80%
    );
    filter: blur(18px);
    transform: rotate(-6deg);
    animation: aurora-drift 60s ease-in-out infinite alternate;
  }

  @keyframes aurora-drift {
    to {
      transform: rotate(-3deg) translateX(6%);
    }
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

  /* ---- Weather ------------------------------------------------------ */
  /* One mote, five climates. The mood class chooses colour, shape, and
     which way the sky is falling. */
  .mote {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    opacity: 0;
    transform: scale(var(--scale));
    will-change: transform, opacity;
  }

  /* Ashen wastes: embers climb, bright and hurried, and gutter out. */
  .ember .mote {
    background: oklch(0.78 0.16 45);
    box-shadow: 0 0 7px oklch(0.75 0.17 40 / 0.9);
    animation: rise var(--dur) ease-in-out var(--delay) infinite;
  }

  /* Mire and weald: spores wander sideways, in no hurry at all. */
  .verdant .mote {
    background: oklch(0.82 0.11 calc(var(--rh) * 1));
    box-shadow: 0 0 6px oklch(0.8 0.12 calc(var(--rh) * 1) / 0.8);
    animation: wander calc(var(--dur) * 1.4) ease-in-out var(--delay) infinite;
  }

  /* Storm peaks: thin flecks streak down-wind. */
  .storm .mote {
    width: 1.5px;
    height: 9px;
    border-radius: 2px;
    background: oklch(0.85 0.06 calc(var(--rh) * 1) / 0.8);
    box-shadow: 0 0 4px oklch(0.85 0.08 calc(var(--rh) * 1) / 0.6);
    animation: streak calc(var(--dur) * 0.28) linear var(--delay) infinite;
  }

  /* Cavern dark: dust hangs, barely admitting it moves. */
  .cavern .mote {
    width: 2px;
    height: 2px;
    background: oklch(0.78 0.05 calc(var(--rh) * 1));
    box-shadow: 0 0 5px oklch(0.75 0.06 calc(var(--rh) * 1) / 0.7);
    animation: hang calc(var(--dur) * 1.8) ease-in-out var(--delay) infinite;
  }

  /* The Spire: motes fall upward. It is not a comfort. */
  .weather.void .mote {
    background: oklch(0.78 0.13 calc(var(--rh) * 1));
    box-shadow: 0 0 8px oklch(0.72 0.15 calc(var(--rh) * 1) / 0.9);
    animation: unfall calc(var(--dur) * 1.2) ease-in var(--delay) infinite;
  }

  @keyframes rise {
    0% {
      transform: translate(0, 0) scale(var(--scale));
      opacity: 0;
    }
    12% {
      opacity: 0.85;
    }
    70% {
      opacity: 0.4;
    }
    100% {
      transform: translate(var(--sway), -46vh) scale(calc(var(--scale) * 0.5));
      opacity: 0;
    }
  }

  @keyframes wander {
    0% {
      transform: translate(0, 0) scale(var(--scale));
      opacity: 0;
    }
    18% {
      opacity: 0.7;
    }
    50% {
      transform: translate(calc(var(--sway) * 2), -12px) scale(var(--scale));
      opacity: 0.35;
    }
    80% {
      opacity: 0.6;
    }
    100% {
      transform: translate(var(--sway), -30px) scale(var(--scale));
      opacity: 0;
    }
  }

  @keyframes streak {
    0% {
      transform: translate(0, -12vh) rotate(9deg) scale(var(--scale));
      opacity: 0;
    }
    15% {
      opacity: 0.65;
    }
    85% {
      opacity: 0.5;
    }
    100% {
      transform: translate(calc(var(--sway) * -1.5), 55vh) rotate(9deg) scale(var(--scale));
      opacity: 0;
    }
  }

  @keyframes hang {
    0%,
    100% {
      transform: translate(0, 0) scale(var(--scale));
      opacity: 0.15;
    }
    50% {
      transform: translate(var(--sway), -14px) scale(var(--scale));
      opacity: 0.5;
    }
  }

  @keyframes unfall {
    0% {
      transform: translate(0, 6vh) scale(var(--scale));
      opacity: 0;
    }
    20% {
      opacity: 0.75;
    }
    100% {
      transform: translate(calc(var(--sway) * 0.6), -60vh) scale(calc(var(--scale) * 1.15));
      opacity: 0;
    }
  }

  /* Far-off lightning: the whole sky admits it, twice, then denies it. */
  .lightning {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      70% 55% at 62% 18%,
      oklch(0.9 0.06 calc(var(--rh) * 1) / 0.14) 0%,
      transparent 65%
    );
    opacity: 0;
    animation: far-lightning 13s ease-out infinite;
  }

  @keyframes far-lightning {
    0%,
    88.5%,
    91.5%,
    100% {
      opacity: 0;
    }
    89% {
      opacity: 1;
    }
    90% {
      opacity: 0.2;
    }
    92% {
      opacity: 0.7;
    }
    94% {
      opacity: 0;
    }
  }

  @keyframes drift-a {
    to {
      transform: translate(8vmax, -6vmax) scale(1.1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blob,
    .mote,
    .nebula,
    .aurora,
    .lightning {
      animation: none;
    }
    /* motion-off: let the weather rest, softly lit, where it sits */
    .mote {
      opacity: 0.35;
    }
  }
</style>
