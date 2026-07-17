<script lang="ts">
  import type { SignDef } from '../content/identity'

  /** A birth-sign constellation: gilt-joined stars in the sign's hue, each
   *  star twinkling on its own clock. The same star-figure language as the
   *  night sky behind the whole game. */
  let { sign, lit = false }: { sign: SignDef; lit?: boolean } = $props()

  /** Line indices resolved to coordinates once, so the markup stays honest
   *  under strict indexing. */
  const segments = $derived(
    sign.lines.map(([a, b]) => ({ from: sign.stars[a] ?? [0, 0], to: sign.stars[b] ?? [0, 0] })),
  )
</script>

<svg viewBox="0 0 100 100" role="img" aria-label="{sign.name} constellation" style:--sh={sign.hue} class:lit>
  <g stroke="oklch(0.78 0.1 85 / 0.35)" stroke-width="0.9" fill="none">
    {#each segments as s, i (i)}
      <line x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} />
    {/each}
  </g>
  {#each sign.stars as [x, y], i (i)}
    <circle class="star" cx={x} cy={y} r={i === 0 ? 2.6 : 1.9} style:--tw="{(i * 0.7) % 3.2}s" />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .star {
    fill: oklch(0.85 0.1 var(--sh));
    animation: twinkle 3.2s ease-in-out var(--tw) infinite;
  }

  svg.lit .star {
    filter: drop-shadow(0 0 3px oklch(0.8 0.13 var(--sh) / 0.9));
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .star {
      animation: none;
      opacity: 0.85;
    }
  }
</style>
