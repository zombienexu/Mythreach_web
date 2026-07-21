<script lang="ts">
  import { onMount } from 'svelte'
  import Filigree from '../components/Filigree.svelte'
  import { loadSettings } from '../profile'
  import { CODEX_DIRECTIVE, INTRO_LINES, LORE_LINES } from './content'

  /** The opening sequence: a cold Threshold spin-up, then the Institute's lore
   *  rolls line by line, and the sequence closes by handing the Fieldworker
   *  their first Codex directive as a received plaque. Skippable throughout. */
  let { ondone }: { ondone: () => void } = $props()

  type Phase = 'intro' | 'lore' | 'directive'
  let phase = $state<Phase>('intro')
  /** how many intro readouts have lit */
  let introStep = $state(0)
  /** how many lore lines have rolled in */
  let loreShown = $state(0)

  let reduced = false
  const timers: ReturnType<typeof setTimeout>[] = []

  function clearTimers(): void {
    timers.forEach(clearTimeout)
    timers.length = 0
  }

  /** Jump straight to the directive plaque — reveal everything at once. */
  function toDirective(): void {
    clearTimers()
    introStep = INTRO_LINES.length
    loreShown = LORE_LINES.length
    phase = 'directive'
  }

  /** A click anywhere fast-forwards: intro/lore → directive; directive → done. */
  function skip(): void {
    if (phase === 'directive') ondone()
    else toDirective()
  }

  function runLore(): void {
    phase = 'lore'
    LORE_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => (loreShown = i + 1), i * 1150))
    })
    timers.push(setTimeout(() => (phase = 'directive'), LORE_LINES.length * 1150 + 700))
  }

  onMount(() => {
    reduced = loadSettings(localStorage).motion === 'reduced'
    if (reduced) {
      // Reduced motion: no roll — everything is already present, one click on.
      toDirective()
      return
    }
    // Intro readouts tick, then the lore rolls.
    INTRO_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => (introStep = i + 1), 420 + i * 620))
    })
    timers.push(setTimeout(runLore, 420 + INTRO_LINES.length * 620 + 500))
    return clearTimers
  })
</script>

<button class="opening" onclick={skip} aria-label="Skip">
  <div class="scan" aria-hidden="true"></div>

  {#if phase === 'intro'}
    <div class="stage">
      <div class="rings" aria-hidden="true">
        <span class="ring r1"></span>
        <span class="ring r2"></span>
        <span class="ring r3"></span>
        <span class="core"></span>
      </div>
      <ul class="intro" aria-live="polite">
        {#each INTRO_LINES as line, i (line)}
          <li class:lit={introStep > i}>
            <span class="dot" class:on={introStep > i}></span>
            <span class="readout">{line}</span>
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <div class="stage lore-stage">
      <p class="from readout">Institute of Recovered Arts · uplink briefing</p>
      <ul class="lore" aria-live="polite">
        {#each LORE_LINES as line, i (line)}
          {#if loreShown > i}
            <li class:latest={loreShown === i + 1 && phase === 'lore'}>{line}</li>
          {/if}
        {/each}
      </ul>

      {#if phase === 'directive'}
        <article class="plaque console-panel ticked" aria-label="Codex directive received">
          <Filigree inset={6} size={16} />
          <header class="p-head">
            <span class="mono code">{CODEX_DIRECTIVE.code}</span>
            <span class="tag">directive received</span>
          </header>
          <h2 class="p-title">{CODEX_DIRECTIVE.title}</h2>
          <p class="p-giver readout">from · {CODEX_DIRECTIVE.giver}</p>
          <p class="p-obj">{CODEX_DIRECTIVE.objective}</p>
          <p class="p-note">{CODEX_DIRECTIVE.note}</p>
          <!-- any click in the directive phase advances (handled by the outer
               skip button), so this is a visual affordance only -->
          <div class="p-foot">
            <span class="uplink-btn">Open the field roster ▸</span>
          </div>
        </article>
      {/if}
    </div>
  {/if}

  {#if phase !== 'directive'}
    <p class="hint readout">click to skip</p>
  {/if}
</button>

<style>
  .opening {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    border: 0;
    cursor: pointer;
    text-align: center;
    background:
      radial-gradient(80% 70% at 50% 30%, oklch(0.19 0.04 225 / 0.85), transparent 70%),
      var(--console-deep);
    animation: fade var(--dur-slow) ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .scan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, oklch(0.84 0.12 205 / 0.045) 50%, transparent);
    height: 34%;
    animation: uplink-scan 7s linear infinite;
    mix-blend-mode: screen;
  }

  .stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
    padding: 24px;
  }

  /* ── intro rings ── */
  .rings {
    position: relative;
    width: 150px;
    height: 150px;
    display: grid;
    place-items: center;
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid var(--signal);
    opacity: 0.6;
    animation: collapse 2.6s var(--ease-out-expo) infinite;
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
    }
    40% {
      opacity: 0.7;
    }
    to {
      transform: scale(0.12);
      opacity: 0;
    }
  }
  .core {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--signal);
    box-shadow: 0 0 22px var(--signal);
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.4;
    }
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 280px;
  }
  .intro li {
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0.3;
    transition: opacity var(--dur) var(--ease-out-expo);
  }
  .intro li.lit {
    opacity: 1;
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

  /* ── rolling lore ── */
  .lore-stage {
    width: min(680px, 92vw);
    gap: 22px;
  }
  .from {
    opacity: 0.7;
  }
  .lore {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }
  .lore li {
    font-family: var(--font-display);
    font-size: clamp(15px, 2.4vw, 20px);
    line-height: 1.5;
    color: var(--text-dim);
    max-width: 54ch;
    animation: roll-in 0.8s var(--ease-out-expo) both;
  }
  .lore li.latest {
    color: var(--signal);
  }
  @keyframes roll-in {
    from {
      opacity: 0;
      transform: translateY(10px);
      filter: blur(3px);
    }
  }

  /* ── directive plaque ── */
  .plaque {
    width: min(440px, 92vw);
    margin-top: 6px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    border-color: oklch(0.84 0.12 205 / 0.4);
    box-shadow: 0 0 50px oklch(0.6 0.1 210 / 0.18);
    animation: plaque-in var(--dur-epic) var(--ease-out-expo) both;
  }
  @keyframes plaque-in {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(12px);
      filter: brightness(1.6);
    }
  }
  .p-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .code {
    font-size: 10px;
    color: var(--signal-dim);
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 999px;
    color: oklch(0.16 0.02 230);
    background: var(--signal);
  }
  .p-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 560;
    color: var(--signal);
    margin-top: 2px;
  }
  .p-giver {
    opacity: 0.8;
  }
  .p-obj {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--text);
    margin-top: 4px;
  }
  .p-note {
    font-size: 12px;
    line-height: 1.55;
    color: var(--text-dim);
  }
  .p-foot {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .hint {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    .opening,
    .scan,
    .ring,
    .core,
    .lore li,
    .plaque {
      animation: none;
    }
  }
</style>
