<script lang="ts">
  import { REGIONS } from '../../engine'
  import Background from '../components/Background.svelte'
  import Filigree from '../components/Filigree.svelte'
  import { CLASS_BY_ID } from '../content/identity'
  import {
    applyMotion,
    eraseSlot,
    loadSettings,
    readSlots,
    saveSettings,
    type GameSettings,
    type SlotId,
    type SlotView,
  } from '../profile'
  import ClassEmblem from './ClassEmblem.svelte'
  import TitleSigil from './TitleSigil.svelte'

  let {
    onenter,
    oncreate,
  }: {
    /** Enter the world with an existing save. */
    onenter: (slot: SlotId) => void
    /** Begin character creation into an empty slot. */
    oncreate: (slot: SlotId) => void
  } = $props()

  let slots: SlotView[] = $state(readSlots(localStorage))
  let confirming: SlotId | null = $state(null)
  let showSettings = $state(false)
  let settings: GameSettings = $state(loadSettings(localStorage))

  const LETTERS = 'MYTHREACH'.split('')

  function classOf(s: SlotView) {
    return CLASS_BY_ID[s.profile?.classId ?? 'arcanist']
  }

  function regionName(id: string): string {
    return REGIONS.find((r) => r.id === id)?.name ?? 'The Reach'
  }

  /** "moments ago", "3 h ago", "12 d ago" — the atlas keeps loose time. */
  function ago(ts: number | undefined): string {
    if (!ts) return 'long ago'
    const mins = Math.floor((Date.now() - ts) / 60_000)
    if (mins < 2) return 'moments ago'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 48) return `${hours} h ago`
    return `${Math.floor(hours / 24)} d ago`
  }

  function erase(slot: SlotId): void {
    eraseSlot(localStorage, slot)
    slots = readSlots(localStorage)
    confirming = null
  }

  function update(patch: Partial<GameSettings>): void {
    settings = { ...settings, ...patch }
    saveSettings(localStorage, settings)
    applyMotion(settings)
  }
</script>

<Background hue={300} />

<div class="title-screen">
  <header class="masthead">
    <div class="sigil"><TitleSigil /></div>
    <h1 class="wordmark" aria-label="Mythreach">
      {#each LETTERS as ch, i (i)}
        <span class="letter" style:--i={i}>{ch}</span>
      {/each}
    </h1>
    <p class="tagline rule mid">an idle grimoire of the long hunt</p>
  </header>

  <section class="slots" aria-label="Save slots">
    {#each slots as s, i (s.id)}
      {@const occupied = s.summary !== null || s.profile !== null}
      {@const cls = classOf(s)}
      <article class="slot glass" class:occupied style:--i={i} style:--ch={cls.hue}>
        <Filigree inset={6} size={18} />
        {#if occupied && confirming === s.id}
          <div class="confirm">
            <p class="confirm-q">Erase <strong>{s.profile?.name ?? 'The Arcanist'}</strong> for good?</p>
            <p class="confirm-warn">Level {s.summary?.level ?? 1} — there is no undo, and the Reach forgets quickly.</p>
            <div class="confirm-row">
              <button class="chip wound" onclick={() => erase(s.id)}>Erase</button>
              <button class="chip" onclick={() => (confirming = null)}>Keep</button>
            </div>
          </div>
        {:else if occupied}
          <button
            class="erase"
            aria-label="Erase this save"
            onclick={(e) => {
              e.stopPropagation()
              confirming = s.id
            }}>✕</button
          >
          <button class="body enter" onclick={() => onenter(s.id)}>
            <span class="emblem"><ClassEmblem classId={cls.id} /></span>
            <span class="who">
              <span class="name">{s.profile?.name ?? 'The Arcanist'}</span>
              <span class="line"
                >Level <span class="num">{s.summary?.level ?? 1}</span> · {cls.name}</span
              >
              <span class="where">{regionName(s.summary?.regionId ?? '')}</span>
              <span class="when">last played {ago(s.profile?.playedAt)}</span>
            </span>
            <span class="go">Enter the Reach ⟶</span>
          </button>
        {:else}
          <button class="body empty" onclick={() => oncreate(s.id)}>
            <span class="quill" aria-hidden="true">✒</span>
            <span class="who">
              <span class="name dim">An unwritten page</span>
              <span class="line dim">No one lives here yet</span>
            </span>
            <span class="go">Begin a new legend ⟶</span>
          </button>
        {/if}
      </article>
    {/each}
  </section>

  <footer class="foot">
    <button class="seal quiet" onclick={() => (showSettings = !showSettings)} aria-expanded={showSettings}>
      {showSettings ? 'Close settings' : 'Settings'}
    </button>
    <span class="keep">Your legends live in this browser and autosave as you play.</span>
  </footer>

  {#if showSettings}
    <section class="settings glass" aria-label="Settings">
      <h2 class="rule">The instruments</h2>

      <div class="row">
        <div class="label">
          <span class="k">Sound</span>
          <span class="d">Spellcraft, loot, and the low drone of bosses.</span>
        </div>
        <button
          class="switch"
          role="switch"
          aria-checked={!settings.muted}
          aria-label="Sound"
          onclick={() => update({ muted: !settings.muted })}
        >
          <span class="thumb"></span>
        </button>
      </div>

      <div class="row">
        <div class="label">
          <span class="k">Screen shake</span>
          <span class="d">The whole page takes the hit. Turn off to hold the map still.</span>
        </div>
        <button
          class="switch"
          role="switch"
          aria-checked={settings.shake}
          aria-label="Screen shake"
          onclick={() => update({ shake: !settings.shake })}
        >
          <span class="thumb"></span>
        </button>
      </div>

      <div class="row">
        <div class="label">
          <span class="k">Reduced motion</span>
          <span class="d">Quiets the ambient sky and ornament, even if your system doesn’t ask for it.</span>
        </div>
        <button
          class="switch"
          role="switch"
          aria-checked={settings.motion === 'reduced'}
          aria-label="Reduced motion"
          onclick={() => update({ motion: settings.motion === 'reduced' ? 'auto' : 'reduced' })}
        >
          <span class="thumb"></span>
        </button>
      </div>
    </section>
  {/if}
</div>

<style>
  .title-screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
    padding: 48px 28px 36px;
  }

  /* ---- masthead ---------------------------------------------------- */
  .masthead {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .sigil {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(430px, 78vw);
    aspect-ratio: 1;
    transform: translate(-50%, -56%);
    opacity: 0.5;
    pointer-events: none;
  }

  .wordmark {
    position: relative;
    margin: 0;
    font-size: clamp(46px, 9vw, 96px);
    font-weight: 640;
    letter-spacing: 0.13em;
    text-indent: 0.13em; /* recenters the tracked type */
    line-height: 1.1;
    filter: drop-shadow(0 2px 22px oklch(0.7 0.12 80 / 0.35));
  }

  /* Each letter carries its own slice of one long gilt gradient (a parent
     background-clip:text can't paint through animated child spans), rises
     out of the dark in turn, and shares the slow sheen. */
  .letter {
    --bp: calc(var(--i) * 12.5%);
    display: inline-block;
    background: linear-gradient(
      100deg,
      oklch(0.72 0.1 85),
      oklch(0.93 0.07 92) 30%,
      oklch(0.68 0.13 60) 55%,
      oklch(0.88 0.09 85) 80%,
      oklch(0.72 0.1 85)
    );
    background-size: 900% 100%;
    background-position: var(--bp) 0;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation:
      letter-in 0.9s calc(var(--i) * 70ms + 250ms) var(--ease-out-expo) both,
      sheen 11s linear infinite;
  }

  @supports not (background-clip: text) {
    .letter {
      background: none;
      color: var(--gilt);
    }
  }

  @keyframes letter-in {
    from {
      opacity: 0;
      transform: translateY(0.45em) scale(0.94);
      filter: blur(7px);
    }
  }

  @keyframes sheen {
    from {
      background-position: var(--bp) 0;
    }
    to {
      background-position: calc(var(--bp) + 225%) 0;
    }
  }

  .tagline {
    width: min(520px, 82vw);
    margin: 4px 0 0;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 14px;
    font-style: italic;
    letter-spacing: 0.24em;
    color: var(--text-dim);
    animation: fade-up 1s 1s var(--ease-out-expo) both;
  }

  /* ---- save slots ---------------------------------------------------- */
  .slots {
    display: grid;
    grid-template-columns: repeat(3, minmax(240px, 300px));
    gap: 18px;
    animation: fade-up 0.9s 1.15s var(--ease-out-expo) both;
  }

  .slot {
    position: relative;
    min-height: 208px;
    display: flex;
    transition:
      transform var(--dur) var(--ease-out-expo),
      box-shadow var(--dur) ease;
  }

  .slot:hover {
    transform: translateY(-4px);
    box-shadow:
      0 24px 44px -18px oklch(0.05 0.02 280 / 0.95),
      0 0 30px -8px oklch(0.7 0.13 var(--ch) / 0.35);
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 22px 18px 18px;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: inherit;
    text-align: center;
  }

  .emblem {
    width: 52px;
    height: 52px;
  }

  .quill {
    font-size: 30px;
    color: oklch(0.65 0.04 80 / 0.75);
    transform: rotate(-8deg);
  }

  .who {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .name {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 580;
    color: var(--text);
  }

  .line {
    font-size: 12.5px;
    color: oklch(0.78 0.1 var(--ch));
  }

  .where {
    font-size: 12px;
    color: var(--text-dim);
  }

  .when {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: oklch(0.55 0.03 80);
  }

  .dim {
    color: var(--text-dim);
  }

  .name.dim {
    font-style: italic;
    font-weight: 480;
  }

  .go {
    margin-top: 4px;
    font-size: 11.5px;
    font-weight: 620;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--gilt);
    opacity: 0;
    transform: translateY(4px);
    transition:
      opacity var(--dur) ease,
      transform var(--dur) var(--ease-out-expo);
  }

  .slot:hover .go,
  .body:focus-visible .go {
    opacity: 1;
    transform: none;
  }

  .erase {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid oklch(0.6 0.1 25 / 0.35);
    background: none;
    color: oklch(0.6 0.08 25 / 0.8);
    font-size: 11px;
    cursor: pointer;
    transition:
      color var(--dur-fast) ease,
      border-color var(--dur-fast) ease;
  }

  .erase:hover {
    color: oklch(0.72 0.17 25);
    border-color: oklch(0.6 0.18 25 / 0.7);
  }

  .confirm {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
  }

  .confirm-q {
    margin: 0;
    font-size: 14px;
  }

  .confirm-warn {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  .confirm-row {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .chip {
    padding: 6px 14px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
    color: var(--text);
    border: 1px solid oklch(0.85 0.03 260 / 0.2);
    background: oklch(0.8 0.02 260 / 0.05);
  }

  .chip.wound {
    color: oklch(0.72 0.17 25);
    border-color: oklch(0.6 0.18 25 / 0.5);
  }

  /* ---- footer & settings -------------------------------------------- */
  .foot {
    display: flex;
    align-items: center;
    gap: 16px;
    animation: fade-up 0.9s 1.35s var(--ease-out-expo) both;
  }

  .keep {
    font-size: 11.5px;
    color: oklch(0.55 0.03 80);
  }

  .settings {
    width: min(560px, 92vw);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: fade-up var(--dur-slow) var(--ease-out-expo) both;
  }

  .settings h2 {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .k {
    font-size: 13.5px;
    font-weight: 600;
  }

  .d {
    font-size: 12px;
    color: var(--text-dim);
  }

  .switch {
    flex-shrink: 0;
    width: 42px;
    height: 24px;
    padding: 2px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.25);
    background: oklch(0.3 0.02 280 / 0.6);
    cursor: pointer;
    transition:
      background var(--dur-fast) ease,
      border-color var(--dur-fast) ease;
  }

  .switch[aria-checked='true'] {
    background: oklch(0.55 0.1 195 / 0.55);
    border-color: oklch(0.8 0.11 195 / 0.6);
  }

  .thumb {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: oklch(0.85 0.02 85);
    transition: transform var(--dur-fast) var(--ease-punch);
  }

  .switch[aria-checked='true'] .thumb {
    transform: translateX(18px);
    background: oklch(0.95 0.03 195);
  }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
  }

  @media (max-width: 980px) {
    .slots {
      grid-template-columns: minmax(260px, 340px);
    }

    .title-screen {
      gap: 28px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .wordmark,
    .letter,
    .tagline,
    .slots,
    .foot,
    .settings {
      animation: none;
    }
  }
</style>
