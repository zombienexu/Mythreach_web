<script lang="ts">
  import Background from '../components/Background.svelte'
  import Filigree from '../components/Filigree.svelte'
  import {
    CLASSES,
    CLASS_BY_ID,
    ORIGINS,
    SIGNS,
    forgeName,
    validName,
    type ClassId,
  } from '../content/identity'
  import type { SlotId, SlotProfile } from '../profile'
  import ClassEmblem from './ClassEmblem.svelte'
  import SignMark from './SignMark.svelte'

  let {
    slot,
    onback,
    onbegin,
  }: {
    slot: SlotId
    onback: () => void
    /** The ceremony is complete — write the profile and enter the world. */
    onbegin: (profile: SlotProfile) => void
  } = $props()

  let name = $state(forgeName())
  let classId: ClassId = $state('arcanist')
  let originId = $state(ORIGINS[0]!.id)
  let signId = $state(SIGNS[0]!.id)

  const cls = $derived(CLASS_BY_ID[classId])
  const nameOk = $derived(validName(name))
  const ready = $derived(nameOk)

  function begin(): void {
    if (!ready) return
    const now = Date.now()
    onbegin({
      name: name.trim(),
      classId,
      originId,
      signId,
      createdAt: now,
      playedAt: now,
    })
  }
</script>

<Background hue={cls.hue} />

<div class="creation">
  <header class="mast">
    <button class="seal quiet back" onclick={onback}>⟵ Title</button>
    <h1>Write yourself into the myth</h1>
    <p class="sub">Slot {slot} — the atlas is holding a page open.</p>
  </header>

  <!-- I. The Name -->
  <section class="chapter" style:--i={0} aria-label="Name">
    <h2 class="rule"><span class="numeral">I</span> The Name</h2>
    <div class="name-row">
      <input
        class="name-input"
        type="text"
        maxlength="16"
        spellcheck="false"
        placeholder="Speak it"
        bind:value={name}
        aria-label="Character name"
      />
      <button class="seal quiet" onclick={() => (name = forgeName())}>✒ Let fate write it</button>
    </div>
    {#if !nameOk}
      <p class="hint">A name needs 2–16 characters. The Reach is strict about paperwork.</p>
    {/if}
  </section>

  <!-- II. The Calling -->
  <section class="chapter" style:--i={1} aria-label="Calling">
    <h2 class="rule"><span class="numeral">II</span> The Calling</h2>
    <div class="callings" role="listbox" aria-label="Choose a calling">
      {#each CLASSES as c (c.id)}
        <button
          class="calling"
          class:selected={classId === c.id}
          style:--ch={c.hue}
          role="option"
          aria-selected={classId === c.id}
          onclick={() => (classId = c.id)}
        >
          <span class="c-emblem"><ClassEmblem classId={c.id} /></span>
          <span class="c-name">{c.name}</span>
          <span class="c-role">{c.role}</span>
        </button>
      {/each}
    </div>

    {#key cls.id}
      <article class="detail glass" style:--ch={cls.hue}>
        <Filigree inset={6} size={18} />
        <header class="d-head">
          <div class="d-title">
            <h3>{cls.name}</h3>
            <p class="epithet">{cls.epithet}</p>
          </div>
          <span class="ready-badge">Ready to swear</span>
        </header>
        <p class="lore">{cls.lore}</p>
        <div class="mechanic">
          <span class="m-name">{cls.mechanic.name}</span>
          <span class="m-text">{cls.mechanic.text}</span>
        </div>
        <div class="abilities">
          {#each cls.abilities as a (a.name)}
            <div class="ability">
              <span class="a-head">
                <span class="a-name">{a.name}</span>
                <span class="a-lvl num">Lv {a.unlockLevel}</span>
              </span>
              <span class="a-blurb">{a.blurb}</span>
            </div>
          {/each}
        </div>
      </article>
    {/key}
  </section>

  <!-- III. The Origin -->
  <section class="chapter" style:--i={2} aria-label="Origin">
    <h2 class="rule"><span class="numeral">III</span> The Origin</h2>
    <p class="chapter-note">Where you were before the atlas knew your name. A leaning, never a cage.</p>
    <div class="origins">
      {#each ORIGINS as o (o.id)}
        <button
          class="origin glass"
          class:selected={originId === o.id}
          onclick={() => (originId = o.id)}
          aria-pressed={originId === o.id}
        >
          <span class="o-name">{o.name}</span>
          <span class="o-line">{o.line}</span>
          <span class="o-promise">{o.boon}</span>
        </button>
      {/each}
    </div>
  </section>

  <!-- IV. The Sign -->
  <section class="chapter" style:--i={3} aria-label="Birth sign">
    <h2 class="rule"><span class="numeral">IV</span> The Sign Overhead</h2>
    <p class="chapter-note">The constellation on the night you were written in. The stars remember — and now they act.</p>
    <div class="signs">
      {#each SIGNS as s (s.id)}
        <button
          class="sign glass"
          class:selected={signId === s.id}
          style:--sh={s.hue}
          onclick={() => (signId = s.id)}
          aria-pressed={signId === s.id}
        >
          <span class="s-map"><SignMark sign={s} lit={signId === s.id} /></span>
          <span class="s-name">{s.name}</span>
          <span class="s-omen">{s.omen}</span>
          <span class="s-boon">{s.boon}</span>
        </button>
      {/each}
    </div>
  </section>

  <footer class="foot" style:--i={4}>
    {#if !nameOk}
      <p class="foot-note">The page is waiting on a name.</p>
    {:else}
      <p class="foot-note">{name.trim()}, {cls.name} — born under {SIGNS.find((s) => s.id === signId)?.name}.</p>
    {/if}
    <button class="seal begin" disabled={!ready} onclick={begin}>Begin the long hunt</button>
  </footer>
</div>

<style>
  .creation {
    width: min(880px, 100%);
    margin-inline: auto;
    padding: 40px 26px 60px;
    display: flex;
    flex-direction: column;
    gap: 34px;
  }

  .mast {
    position: relative;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: ch-in 0.8s var(--ease-out-expo) both;
  }

  .back {
    position: absolute;
    left: 0;
    top: 4px;
  }

  .mast h1 {
    font-size: clamp(26px, 4.4vw, 38px);
    background: linear-gradient(100deg, oklch(0.75 0.1 85), oklch(0.92 0.06 92), oklch(0.75 0.1 85));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .sub {
    margin: 0;
    font-size: 12.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  /* Chapters arrive like turned pages, one after the next. */
  .chapter,
  .foot {
    animation: ch-in 0.8s calc(var(--i) * 120ms + 150ms) var(--ease-out-expo) both;
  }

  @keyframes ch-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }

  .chapter {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .chapter h2 {
    font-size: 15px;
    color: var(--gilt);
  }

  .numeral {
    font-size: 12px;
    letter-spacing: 0.1em;
    opacity: 0.7;
    margin-right: 8px;
  }

  .chapter-note {
    margin: -6px 0 0;
    font-size: 12.5px;
    color: var(--text-dim);
  }

  /* ---- I. name ------------------------------------------------------- */
  .name-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .name-input {
    flex: 1;
    min-width: 220px;
    padding: 10px 4px;
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 560;
    letter-spacing: 0.04em;
    color: var(--text);
    background: none;
    border: 0;
    border-bottom: 1px solid oklch(0.78 0.1 85 / 0.35);
    transition: border-color var(--dur-fast) ease;
  }

  .name-input:focus {
    outline: none;
    border-bottom-color: var(--gilt);
  }

  .name-input::placeholder {
    color: oklch(0.5 0.03 80);
    font-style: italic;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: oklch(0.72 0.12 25);
  }

  /* ---- II. callings --------------------------------------------------- */
  .callings {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  .calling {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 14px 6px 11px;
    border-radius: var(--radius);
    border: 1px solid oklch(0.85 0.03 260 / 0.12);
    background: oklch(0.8 0.02 260 / 0.03);
    cursor: pointer;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease,
      background var(--dur-fast) ease;
  }

  .calling:hover {
    transform: translateY(-2px);
    border-color: oklch(0.75 0.1 var(--ch) / 0.5);
  }

  .calling.selected {
    border-color: oklch(0.78 0.12 var(--ch) / 0.8);
    background: oklch(0.7 0.08 var(--ch) / 0.08);
    box-shadow: 0 0 20px -6px oklch(0.7 0.13 var(--ch) / 0.5);
  }

  .c-emblem {
    width: 38px;
    height: 38px;
  }

  .c-name {
    font-family: var(--font-display);
    font-size: 13.5px;
    font-weight: 580;
  }

  .c-role {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: oklch(0.72 0.09 var(--ch));
  }

  /* ---- class detail plate --------------------------------------------- */
  .detail {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 13px;
    animation: plate-in var(--dur-slow) var(--ease-out-expo);
  }

  @keyframes plate-in {
    from {
      opacity: 0;
      transform: translateY(8px);
      filter: brightness(1.4);
    }
  }

  .d-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .d-title h3 {
    font-size: 22px;
    color: oklch(0.85 0.09 var(--ch));
  }

  .epithet {
    margin: 1px 0 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 13px;
    color: var(--text-dim);
  }

  .ready-badge {
    font-size: 10.5px;
    font-weight: 640;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 99px;
    border: 1px solid oklch(0.75 0.12 160 / 0.5);
    color: oklch(0.78 0.13 160);
  }

  .lore {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--text);
  }

  .mechanic {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.75 0.1 var(--ch) / 0.3);
    background: oklch(0.7 0.08 var(--ch) / 0.06);
  }

  .m-name {
    font-size: 11px;
    font-weight: 660;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: oklch(0.8 0.11 var(--ch));
  }

  .m-text {
    font-size: 13px;
    color: var(--text-dim);
  }

  .abilities {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .ability {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  .a-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .a-name {
    font-family: var(--font-display);
    font-size: 13.5px;
    font-weight: 600;
    color: oklch(0.85 0.08 var(--ch));
  }

  .a-lvl {
    font-size: 9.5px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }

  .a-blurb {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
  }

  /* ---- III. origins ---------------------------------------------------- */
  .origins {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .origin {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    text-align: left;
    border: 0;
    cursor: pointer;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      box-shadow var(--dur-fast) ease;
  }

  .origin:hover {
    transform: translateY(-2px);
  }

  .origin.selected {
    box-shadow:
      inset 0 0 0 1px oklch(0.78 0.1 85 / 0.7),
      0 0 18px -6px oklch(0.75 0.1 85 / 0.4);
  }

  .o-name {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
  }

  .o-line {
    font-size: 12.5px;
    color: var(--text-dim);
  }

  .o-promise {
    font-size: 11.5px;
    font-style: italic;
    color: oklch(0.7 0.08 85 / 0.85);
  }

  /* ---- IV. signs -------------------------------------------------------- */
  .signs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .sign {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 12px 12px;
    text-align: center;
    border: 0;
    cursor: pointer;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      box-shadow var(--dur-fast) ease;
  }

  .sign:hover {
    transform: translateY(-2px);
  }

  .sign.selected {
    box-shadow:
      inset 0 0 0 1px oklch(0.78 0.12 var(--sh) / 0.7),
      0 0 20px -6px oklch(0.72 0.13 var(--sh) / 0.5);
  }

  .s-map {
    width: 68px;
    height: 68px;
  }

  .s-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
  }

  .s-omen {
    font-size: 11.5px;
    font-style: italic;
    line-height: 1.45;
    color: var(--text-dim);
  }

  .s-boon {
    font-size: 10.5px;
    line-height: 1.4;
    color: oklch(0.75 0.09 var(--sh) / 0.9);
  }

  /* ---- footer ----------------------------------------------------------- */
  .foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 6px;
  }

  .foot-note {
    margin: 0;
    font-size: 13px;
    font-style: italic;
    color: var(--text-dim);
  }

  .begin {
    font-size: 14px;
    padding: 12px 30px;
  }

  @media (max-width: 860px) {
    .callings {
      grid-template-columns: repeat(3, 1fr);
    }

    .abilities {
      grid-template-columns: 1fr;
    }

    .signs {
      grid-template-columns: repeat(2, 1fr);
    }

    .origins {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mast,
    .chapter,
    .foot,
    .detail {
      animation: none;
    }
  }
</style>
