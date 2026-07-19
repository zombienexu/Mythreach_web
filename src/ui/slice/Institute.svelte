<script lang="ts">
  /** The present day. The Institute of Recovered Arts — a cold field terminal.
   *  Pick a magic system to research; the Threshold projects you into it.
   *  Only War-Weaving is recovered enough to enter in this slice. */
  let {
    hasSave,
    standing,
    onproject,
    onresume,
    onabandon,
  }: {
    hasSave: boolean
    standing: number
    onproject: () => void
    onresume: () => void
    onabandon: () => void
  } = $props()

  interface Sys {
    code: string
    name: string
    world: string
    frame: string
    status: 'recovered' | 'redacted' | 'unknown'
    blurb: string
  }

  const SYSTEMS: Sys[] = [
    {
      code: 'RA-01',
      name: 'War-Weaving',
      world: 'The Ember Legion',
      frame: 'Conscript',
      status: 'recovered',
      blurb: 'Battlefield evocation. Learned on the line, from a caster-sergeant, by surviving.',
    },
    {
      code: 'RA-02',
      name: 'Necrologue',
      world: '▒▒▒▒ necropolis',
      frame: 'Initiate',
      status: 'redacted',
      blurb: 'Forbidden death-accounting. Triangulation incomplete — recover another art to proceed.',
    },
    {
      code: 'RA-03',
      name: 'The Green Rite',
      world: '▒▒▒▒▒ wood',
      frame: 'Supplicant',
      status: 'redacted',
      blurb: 'Druidic life-magic of a temple-folk. Signal too faint to anchor.',
    },
    {
      code: 'RA-??',
      name: '████████',
      world: '████████',
      frame: '—',
      status: 'unknown',
      blurb: 'Resonates with the Threshold itself. Existence inferred, not confirmed.',
    },
  ]

  let selected = $state(0)
  const available = $derived(SYSTEMS[selected]?.status === 'recovered')
</script>

<div class="institute">
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
        <h1>Institute of Recovered Arts</h1>
        <p class="readout">Threshold field terminal · Fieldworker <span class="mono">D-7743</span></p>
      </div>
      <div class="status-lamp">
        <span class="lamp"></span><span class="readout">carrier live</span>
      </div>
    </header>

    <p class="brief">
      Magic was real, once — lost when its worlds fell out of reach. Choose an art. The Threshold will
      seat your consciousness in a life within it. Earn the locals' trust, learn the working, and
      transmit it home.
    </p>

    <div class="grid" role="listbox" aria-label="Magic systems">
      {#each SYSTEMS as s, i (s.code)}
        <button
          class="sys {s.status}"
          class:sel={i === selected}
          role="option"
          aria-selected={i === selected}
          disabled={s.status !== 'recovered'}
          onclick={() => (selected = i)}
        >
          <div class="sys-top">
            <span class="mono code">{s.code}</span>
            <span class="tag {s.status}">{s.status}</span>
          </div>
          <h2 class="sys-name">{s.name}</h2>
          <p class="sys-world">{s.world} · <span class="frame-tag">{s.frame}</span></p>
          <p class="sys-blurb">{s.blurb}</p>
        </button>
      {/each}
    </div>

    <footer class="actions">
      {#if hasSave}
        <div class="resume-line">
          <button class="uplink-btn" onclick={onresume}>Resume uplink ▸</button>
          <span class="readout">expedition active · standing <span class="mono">{standing}</span></span>
        </div>
        <button class="abandon" onclick={onabandon}>Abandon expedition &amp; re-project</button>
      {:else}
        <button class="uplink-btn" disabled={!available} onclick={onproject}>
          {available ? 'Open the Threshold ▸' : 'System unavailable'}
        </button>
        <span class="readout">
          {available ? 'projection target locked' : 'select a recovered art'}
        </span>
      {/if}
    </footer>
  </div>
</div>

<style>
  .institute {
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
    padding: 28px 30px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    padding-bottom: 16px;
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
    letter-spacing: 0.01em;
  }

  .titles p {
    margin-top: 3px;
  }

  .status-lamp {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .lamp {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--signal);
    box-shadow: 0 0 10px var(--signal);
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }

  .brief {
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-dim);
    max-width: 62ch;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .sys {
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
  .sys.recovered:hover {
    border-color: var(--signal);
    transform: translateY(-2px);
  }
  .sys.sel {
    border-color: var(--signal);
    background: var(--signal-faint);
    box-shadow: inset 0 0 0 1px oklch(0.84 0.12 205 / 0.3);
  }
  .sys:disabled {
    cursor: not-allowed;
    opacity: 0.72;
    filter: saturate(0.5);
  }

  .sys-top {
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
  .tag.recovered {
    color: oklch(0.14 0.02 230);
    background: var(--signal);
  }
  .tag.redacted {
    color: var(--signal-dim);
    border: 1px solid var(--console-edge);
  }
  .tag.unknown {
    color: var(--wound);
    border: 1px solid oklch(0.68 0.17 25 / 0.4);
  }

  .sys-name {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 560;
    color: var(--text);
  }
  .sys.recovered .sys-name {
    color: var(--ember-glow);
  }
  .sys-world {
    font-size: 11px;
    color: var(--text-dim);
  }
  .frame-tag {
    color: var(--signal);
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .sys-blurb {
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
    padding-top: 16px;
    border-top: 1px solid var(--console-line);
  }
  .resume-line {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .abandon {
    margin-left: auto;
    background: none;
    border: 0;
    color: var(--text-dim);
    font-size: 11px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .abandon:hover {
    color: var(--wound);
  }

  @media (max-width: 620px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .masthead {
      grid-template-columns: auto 1fr;
    }
    .status-lamp {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scan,
    .crest,
    .lamp,
    .frame {
      animation: none;
    }
  }
</style>
