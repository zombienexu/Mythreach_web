<script lang="ts">
  import { onMount } from 'svelte'

  let {
    name,
    onslam,
    ondone,
  }: {
    name: string
    /** fired on the frame the name lands, so the page can shake with it */
    onslam?: () => void
    ondone?: () => void
  } = $props()

  let root: HTMLDivElement | undefined = $state()
  let word: HTMLDivElement | undefined = $state()
  let rule: HTMLDivElement | undefined = $state()

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !root || !word || !rule) {
      const t = setTimeout(() => ondone?.(), 1400)
      return () => clearTimeout(t)
    }

    // GSAP is loaded here and nowhere else: a staggered, multi-target timeline
    // is the one thing in this game hand-rolled easing would be worse at, and
    // it only ever runs when you choose to challenge a boss.
    let kill: (() => void) | null = null
    let cancelled = false

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !root || !word || !rule) return

      // Epic tier: nothing this heavy should arrive in under a second.
      const tl = gsap.timeline({ onComplete: () => ondone?.() })
      tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' })
        .fromTo(
          word,
          { scale: 1.75, opacity: 0, letterSpacing: '0.5em' },
          {
            scale: 1,
            opacity: 1,
            letterSpacing: '0.1em',
            duration: 0.62,
            ease: 'expo.out',
            onComplete: () => onslam?.(),
          },
          0.1,
        )
        .fromTo(rule, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.55, ease: 'expo.out' }, '-=0.3')
        .to({}, { duration: 0.75 })
        .to([word, rule], { opacity: 0, duration: 0.35, ease: 'power2.in' })
        .to(root, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.2')

      kill = () => tl.kill()
    })

    return () => {
      cancelled = true
      kill?.()
    }
  })
</script>

<div class="boss-intro" bind:this={root} role="status" aria-live="polite">
  <div class="stack">
    <span class="kicker">The way opens</span>
    <div class="word" bind:this={word}>{name}</div>
    <div class="rule" bind:this={rule}></div>
  </div>
</div>

<style>
  .boss-intro {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    pointer-events: none;
    background: radial-gradient(70% 55% at 50% 50%, oklch(0.1 0.03 30 / 0.62) 0%, oklch(0.06 0.02 280 / 0.9) 100%);
    backdrop-filter: blur(3px);
  }

  .stack {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding-bottom: 6vh;
  }

  .kicker {
    font-size: 11px;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: oklch(0.72 0.09 60);
  }

  .word {
    font-family: var(--font-display);
    font-size: clamp(34px, 6vw, 68px);
    font-weight: 620;
    color: oklch(0.94 0.08 75);
    text-align: center;
    text-shadow:
      0 0 30px oklch(0.8 0.16 55 / 0.7),
      0 0 90px oklch(0.7 0.18 40 / 0.45);
    will-change: transform, opacity;
  }

  .rule {
    width: min(420px, 60vw);
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--ember), transparent);
    box-shadow: 0 0 16px oklch(0.8 0.13 80 / 0.7);
  }
</style>
