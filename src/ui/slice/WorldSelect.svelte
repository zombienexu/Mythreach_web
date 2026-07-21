<script lang="ts">
  /** The world-select station. One world == one magic system == one calling.
   *  Only the Ember Legion is recovered enough to project into; the rest are
   *  rumoured, shown locked. Choosing the open world finalizes the profile's
   *  calling before the game boots. */
  import { CODEX_DIRECTIVE, WORLDS, type WorldOption } from './content'

  let {
    onselect,
    onback,
  }: {
    /** A recovered world was chosen — hand its calling back to finalize. */
    onselect: (world: WorldOption) => void
    onback: () => void
  } = $props()

  // default the selection to the first open world
  let selected = $state(Math.max(0, WORLDS.findIndex((w) => w.status === 'open')))
  const chosen = $derived(WORLDS[selected])
  const available = $derived(chosen?.status === 'open')

  function project(): void {
    if (chosen && chosen.status === 'open') onselect(chosen)
  }
</script>

<div class="station">
  <div class="scan" aria-hidden="true"></div>

  <div class="frame ticked console-panel">
    <header class="masthead">
      <div class="crest" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--signal)" stroke-width="1" opacity="0.5" />
          <circle cx="24" cy="24" r="13" fill="none" stroke="var(--signal)" stroke-width="1" opacity="0.7" />
          <path d="M24 4 V44 M4 24 H44" stroke="var(--signal)" stroke-width="0.75" opacity="0.35" />
          <circle cx="24" cy="24" r="3" fill="var(--signal)" />
        </svg>
      </div>
      <div class="titles">
        <h1>Projection Station</h1>
        <p class="readout">threshold field terminal · select a recovered art</p>
      </div>
      <button class="back readout" onclick={onback}>⟵ briefing</button>
    </header>

    <div class="directive">
      <span class="mono d-code">{CODEX_DIRECTIVE.code}</span>
      <span class="d-text">Standing directive · <strong>{CODEX_DIRECTIVE.title}</strong></span>
    </div>

    <div class="grid" role="listbox" aria-label="Worlds">
      {#each WORLDS as w, i (w.code)}
        <button
          class="world {w.status}"
          class:sel={i === selected}
          role="option"
          aria-selected={i === selected}
          disabled={w.status !== 'open'}
          style:--wh={w.hue}
          onclick={() => (selected = i)}
        >
          <div class="w-top">
            <span class="mono code">{w.code}</span>
            <span class="tag {w.status}">{w.status === 'open' ? 'recovered' : 'locked'}</span>
          </div>
          <h2 class="w-name">{w.system}</h2>
          <p class="w-world">{w.world} · <span class="frame-tag">{w.frame}</span></p>
          <p class="w-teaser">{w.teaser}</p>
        </button>
      {/each}
    </div>

    <footer class="actions">
      <button class="uplink-btn" disabled={!available} onclick={project}>
        {available ? 'Open the Threshold ▸' : 'System unavailable'}
      </button>
      <span class="readout">
        {available ? `projection target · ${chosen?.world}` : 'select a recovered art'}
      </span>
    </footer>
  </div>
</div>

<style>
  .station {
    position: relative;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    background:
      radial-gradient(120% 80% at 50% -10%, oklch(0.2 0.04 220 / 0.6), transparent 60%),
      radial-gradient(90% 60% at 50% 110%, oklch(0.16 0.05 250 / 0.5), transparent 60%),
      var(--console-deep);
    overflow: hidden;
  }
  .scan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, oklch(0.84 0.12 205 / 0.05) 50%, transparent);
    height: 40%;
    animation: uplink-scan 6s linear infinite;
    opacity: 0.6;
  }

  .frame {
    width: min(780px, 100%);
    padding: 26px 30px 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    z-index: 1;
    animation: rise var(--dur-slow) var(--ease-out-expo);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
  }

  .masthead {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--console-line);
  }
  .crest {
    display: grid;
    place-items: center;
    animation: spin 60s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  h1 {
    font-family: var(--font-display);
    font-size: 23px;
    font-weight: 560;
    color: var(--text);
  }
  .titles p {
    margin-top: 3px;
  }
  .back {
    background: none;
    border: 0;
    cursor: pointer;
    padding: 4px;
  }
  .back:hover {
    color: var(--signal);
  }

  .directive {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-edge);
    background: var(--signal-faint);
  }
  .d-code {
    font-size: 10px;
    color: var(--signal);
  }
  .d-text {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .d-text strong {
    color: var(--text);
    font-weight: 600;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .world {
    text-align: left;
    padding: 14px 15px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-line);
    background: oklch(0.5 0.02 230 / 0.04);
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast),
      transform var(--dur-fast);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .world.open:hover {
    border-color: var(--signal);
    transform: translateY(-2px);
  }
  .world.sel {
    border-color: var(--signal);
    background: var(--signal-faint);
    box-shadow: inset 0 0 0 1px oklch(0.84 0.12 205 / 0.3);
  }
  .world:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    filter: saturate(0.5);
  }

  .w-top {
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
    padding: 2px 7px;
    border-radius: 999px;
  }
  .tag.open {
    color: oklch(0.14 0.02 230);
    background: var(--signal);
  }
  .tag.locked {
    color: var(--signal-dim);
    border: 1px solid var(--console-edge);
  }

  .w-name {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 560;
    color: var(--text);
  }
  .world.open .w-name {
    color: oklch(0.85 0.09 var(--wh));
  }
  .w-world {
    font-size: 11px;
    color: var(--text-dim);
  }
  .frame-tag {
    color: var(--signal);
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .w-teaser {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--text-dim);
    opacity: 0.85;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding-top: 14px;
    border-top: 1px solid var(--console-line);
  }

  @media (max-width: 620px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .masthead {
      grid-template-columns: auto 1fr;
    }
    .back {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .scan,
    .crest,
    .frame {
      animation: none;
    }
  }
</style>
