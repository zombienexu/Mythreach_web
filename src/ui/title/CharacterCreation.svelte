<script lang="ts">
  import Background from '../components/Background.svelte'
  import { CLASS_BY_ID, forgeName, validName } from '../content/identity'
  import type { SlotId } from '../profile'
  import { SLICE_IDENTITY } from '../slice/content'

  let {
    slot,
    onback,
    onname,
  }: {
    slot: SlotId
    onback: () => void
    /** The name is set — the calling is chosen later, at the world station. */
    onname: (name: string) => void
  } = $props()

  // The world (and thus the calling) is chosen later, at the Projection Station.
  // Creation only names the conscript; the warm gilt hue still belongs to the
  // one recovered art.
  const cls = CLASS_BY_ID[SLICE_IDENTITY.classId]

  let name = $state(forgeName())
  const nameOk = $derived(validName(name))

  function begin(): void {
    if (!nameOk) return
    onname(name.trim())
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

  <!-- The Fieldworker -->
  <section class="chapter" aria-label="Fieldworker">
    <h2 class="rule">The Fieldworker</h2>
    <p class="lore">
      The Institute logs one more mind for projection. Your art — the world you will live to learn
      it in — is chosen at the Projection Station, once the Threshold has you.
    </p>
  </section>

  <footer class="foot">
    {#if !nameOk}
      <p class="foot-note">The Threshold is waiting on a name.</p>
    {:else}
      <p class="foot-note">{name.trim()}, logged for projection.</p>
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

  /* ---- fieldworker copy ---------------------------------------------- */
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
