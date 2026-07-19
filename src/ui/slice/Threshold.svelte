<script lang="ts">
  import { onMount } from 'svelte'
  import { loadSettings } from '../profile'

  let { ondone }: { ondone: () => void } = $props()

  const LINES = [
    'Calibrating Threshold',
    'Projecting consciousness',
    'Anchoring persona — Ember Legion',
    'Uplink established',
  ]

  let step = $state(0)
  let done = false

  function finish(): void {
    if (done) return
    done = true
    ondone()
  }

  onMount(() => {
    // Reduced motion: skip straight through — the world is waiting.
    if (loadSettings(localStorage).motion === 'reduced') {
      finish()
      return
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    LINES.forEach((_, i) => timers.push(setTimeout(() => (step = i + 1), 500 + i * 640)))
    timers.push(setTimeout(finish, 500 + LINES.length * 640 + 500))
    return () => timers.forEach(clearTimeout)
  })
</script>

<button class="threshold" onclick={finish} aria-label="Skip projection">
  <div class="stage" style:--k={step}>
    <div class="rings" aria-hidden="true">
      <span class="ring r1"></span>
      <span class="ring r2"></span>
      <span class="ring r3"></span>
      <span class="core"></span>
    </div>

    <ul class="lines" aria-live="polite">
      {#each LINES as line, i (line)}
        <li class:lit={step > i} class:active={step === i + 1}>
          <span class="dot" class:on={step > i}></span>
          <span class="readout">{line}</span>
        </li>
      {/each}
    </ul>

    <p class="hint readout">click to skip</p>
  </div>
</button>

<style>
  .threshold {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    border: 0;
    cursor: pointer;
    background:
      radial-gradient(60% 60% at 50% 45%, oklch(0.18 0.04 220 / 0.9), transparent 70%),
      var(--console-deep);
    animation: warm 2.8s ease-in forwards;
  }
  /* the present is cold; as the uplink lands, the field warms to ember */
  @keyframes warm {
    70% {
      background:
        radial-gradient(60% 60% at 50% 45%, oklch(0.18 0.04 220 / 0.9), transparent 70%),
        var(--console-deep);
    }
    100% {
      background:
        radial-gradient(70% 70% at 50% 45%, oklch(0.22 0.08 55 / 0.9), transparent 70%),
        var(--void-deep);
    }
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }

  .rings {
    position: relative;
    width: 160px;
    height: 160px;
    display: grid;
    place-items: center;
  }
  .ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--signal);
    inset: 0;
    animation: collapse 2.6s var(--ease-out-expo) infinite;
    opacity: 0.6;
  }
  .r2 {
    animation-delay: 0.5s;
  }
  .r3 {
    animation-delay: 1s;
  }
  @keyframes collapse {
    from {
      transform: scale(1);
      opacity: 0;
      border-color: var(--signal);
    }
    40% {
      opacity: 0.7;
    }
    to {
      transform: scale(0.12);
      opacity: 0;
      border-color: var(--ember-war);
    }
  }
  .core {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--signal);
    box-shadow: 0 0 24px var(--signal);
    animation: ignite 2.8s ease-in forwards;
  }
  @keyframes ignite {
    70% {
      background: var(--signal);
      box-shadow: 0 0 24px var(--signal);
    }
    100% {
      background: var(--ember-glow);
      box-shadow: 0 0 48px var(--ember-war);
      transform: scale(1.6);
    }
  }

  .lines {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 280px;
  }
  .lines li {
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0.3;
    transition: opacity var(--dur) var(--ease-out-expo);
  }
  .lines li.lit {
    opacity: 1;
  }
  .lines li.active .readout {
    color: var(--signal);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1px solid var(--signal-dim);
    transition: all var(--dur);
  }
  .dot.on {
    background: var(--signal);
    border-color: var(--signal);
    box-shadow: 0 0 8px var(--signal);
  }

  .hint {
    opacity: 0.4;
  }

  @media (prefers-reduced-motion: reduce) {
    .threshold,
    .ring,
    .core {
      animation: none;
    }
  }
</style>
