<script lang="ts">
  import Background from '../components/Background.svelte'
  import Filigree from '../components/Filigree.svelte'
  import { CLASS_BY_ID, forgeName, validName } from '../content/identity'
  import type { SlotId, SlotProfile } from '../profile'
  import { SLICE_IDENTITY } from '../slice/content'
  import ClassEmblem from './ClassEmblem.svelte'

  let {
    slot,
    onback,
    onbegin,
  }: {
    slot: SlotId
    onback: () => void
    /** The name is set — write the profile and cross the Threshold. */
    onbegin: (profile: SlotProfile) => void
  } = $props()

  // The slice is one system, one life: a War-Weaver of the Ember Legion. Creation
  // names the conscript; the calling itself is fixed.
  const cls = CLASS_BY_ID[SLICE_IDENTITY.classId]

  let name = $state(forgeName())
  const nameOk = $derived(validName(name))

  function begin(): void {
    if (!nameOk) return
    const now = Date.now()
    onbegin({
      name: name.trim(),
      classId: SLICE_IDENTITY.classId,
      originId: SLICE_IDENTITY.originId,
      signId: SLICE_IDENTITY.signId,
      createdAt: now,
      playedAt: now,
    })
  }
</script>

<Background hue={cls.hue} />

<div class="creation">
  <header class="mast">
    <button class="seal quiet back" onclick={onback}>⟵ Title</button>
    <h1>Name the conscript</h1>
    <p class="sub">Slot {slot} — the Legion is cutting orders.</p>
  </header>

  <!-- The Name -->
  <section class="chapter" aria-label="Name">
    <h2 class="rule">The Name</h2>
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
      <p class="hint">A name needs 2–16 characters. The Legion is strict about paperwork.</p>
    {/if}
  </section>

  <!-- The Calling (fixed) -->
  <section class="chapter" aria-label="Calling">
    <h2 class="rule">The Calling</h2>
    <article class="detail glass" style:--ch={cls.hue}>
      <Filigree inset={6} size={18} />
      <div class="d-head">
        <span class="emblem"><ClassEmblem classId={cls.id} /></span>
        <div class="d-title">
          <h3>War-Weaver</h3>
          <p class="epithet">of the Ember Legion — a Conscript on the line</p>
        </div>
        <span class="fixed-badge">Only art recovered</span>
      </div>
      <p class="lore">
        Battlefield evocation, learned from a caster-sergeant by surviving. The other systems are
        still redacted; this is the one the Threshold can reach.
      </p>
    </article>
  </section>

  <footer class="foot">
    {#if !nameOk}
      <p class="foot-note">The orders are waiting on a name.</p>
    {:else}
      <p class="foot-note">{name.trim()}, War-Weaver of the Ember Legion.</p>
    {/if}
    <button class="seal begin" disabled={!nameOk} onclick={begin}>Cross the Threshold</button>
  </footer>
</div>

<style>
  .creation {
    width: min(680px, 100%);
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

  .chapter {
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: ch-in 0.8s 0.15s var(--ease-out-expo) both;
  }

  @keyframes ch-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }

  .chapter h2 {
    font-size: 15px;
    color: var(--gilt);
  }

  /* ---- name ---------------------------------------------------------- */
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

  /* ---- calling plate ------------------------------------------------- */
  .detail {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .d-head {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .emblem {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  .d-title {
    flex: 1;
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

  .fixed-badge {
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

  /* ---- footer -------------------------------------------------------- */
  .foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 6px;
    animation: ch-in 0.8s 0.3s var(--ease-out-expo) both;
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

  @media (prefers-reduced-motion: reduce) {
    .mast,
    .chapter,
    .foot {
      animation: none;
    }
  }
</style>
