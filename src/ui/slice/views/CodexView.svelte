<script lang="ts">
  import type { Game } from '../../game.svelte'
  import { CODEX, TOTAL_FINDINGS } from '../content'

  let { game }: { game: Game } = $props()

  const ex = $derived(game.expedition)
  const pct = $derived(Math.round(ex.recovery * 100))
</script>

<div class="codex">
  <!-- ── Recovery header ─────────────────────────────────── -->
  <section class="panel console-panel ticked recovery">
    <div class="rec-left">
      <span class="readout">institute · recovery of an art</span>
      <h2 class="rec-title">War-Weaving <span class="tier-tag">Tier I</span></h2>
      <p class="rec-note">
        The Codex is your field record. Fill a chapter by <em>observing the magic behave</em>, then
        transmit it home. Recover every chapter and the art is logged in your timeline.
      </p>
    </div>
    <div class="rec-dial" style:--p={ex.recovery}>
      <svg viewBox="0 0 120 120" width="128" height="128" aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="none" stroke="oklch(0.5 0.02 230 / 0.2)" stroke-width="8" />
        <circle
          class="arc"
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="var(--signal)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray={2 * Math.PI * 52}
          stroke-dashoffset={2 * Math.PI * 52 * (1 - ex.recovery)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div class="dial-read">
        <span class="mono pct">{pct}<span class="unit">%</span></span>
        <span class="readout">recovered</span>
      </div>
    </div>
    <div class="rec-stat">
      <span class="readout">findings home</span>
      <span class="mono big">{ex.findings}<span class="of">/ {TOTAL_FINDINGS}</span></span>
      {#if ex.pendingTransmits > 0}
        <span class="pending">{ex.pendingTransmits} ready to transmit</span>
      {/if}
    </div>
  </section>

  <!-- ── Chapters ────────────────────────────────────────── -->
  <div class="chapters">
    {#each CODEX as o (o.id)}
      {@const n = ex.countOf(o.id)}
      {@const complete = ex.isComplete(o.id)}
      {@const sent = ex.isTransmitted(o.id)}
      <section class="chapter console-panel ticked" class:complete class:sent>
        <header class="chead">
          <h3 class="ctitle">{o.title}</h3>
          <span class="findings mono">+{o.findings}</span>
        </header>
        <p class="cnote">{o.note}</p>

        <div class="cprog">
          <div class="meter">
            <span class="fill obs" style:width="{Math.min(100, (n / o.target) * 100)}%"></span>
          </div>
          <span class="count mono">{Math.min(n, o.target)}/{o.target}</span>
        </div>

        <div class="cfoot">
          {#if sent}
            <span class="state sent-tag readout">✓ transmitted home</span>
          {:else if complete}
            <button class="uplink-btn small" onclick={() => game.transmit(o.id)}>Transmit ▸</button>
          {:else}
            <span class="state readout">recording…</span>
          {/if}
        </div>
      </section>
    {/each}
  </div>

  {#if ex.recovered}
    <p class="all-done">
      <span class="ember">War-Weaving fully recovered.</span> In the next slice: Mastery chapters, faction
      ascension, and the second art.
    </p>
  {/if}
</div>

<style>
  .codex {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .panel {
    padding: 20px 22px;
  }

  /* ── recovery header ── */
  .recovery {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 26px;
    align-items: center;
  }
  .rec-title {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 560;
    color: var(--text);
    margin: 3px 0 8px;
  }
  .tier-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--signal);
    border: 1px solid var(--console-edge);
    border-radius: 999px;
    padding: 2px 9px;
    vertical-align: middle;
    margin-left: 6px;
  }
  .rec-note {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-dim);
    max-width: 52ch;
  }
  .rec-note em {
    color: var(--signal);
    font-style: italic;
  }

  .rec-dial {
    position: relative;
    display: grid;
    place-items: center;
  }
  .arc {
    transition: stroke-dashoffset var(--dur-epic) var(--ease-out-expo);
    filter: drop-shadow(0 0 6px oklch(0.84 0.12 205 / 0.5));
  }
  .dial-read {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pct {
    font-size: 30px;
    color: var(--signal);
    line-height: 1;
  }
  .unit {
    font-size: 15px;
  }

  .rec-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }
  .rec-stat .big {
    font-size: 22px;
    color: var(--text);
  }
  .of {
    font-size: 13px;
    color: var(--text-dim);
    margin-left: 3px;
  }
  .pending {
    font-size: 10px;
    color: var(--ember-glow);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* ── chapters ── */
  .chapters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .chapter {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition:
      border-color var(--dur),
      background var(--dur);
  }
  .chapter.complete:not(.sent) {
    border-color: var(--signal);
    box-shadow: inset 0 0 0 1px oklch(0.84 0.12 205 / 0.25), 0 0 24px oklch(0.6 0.1 210 / 0.15);
  }
  .chapter.sent {
    opacity: 0.62;
  }
  .chead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .ctitle {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--text);
  }
  .findings {
    font-size: 13px;
    color: var(--signal);
    font-weight: 600;
  }
  .cnote {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
    min-height: 2.6em;
  }
  .cprog {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cprog .meter {
    flex: 1;
  }
  .fill.obs {
    background: linear-gradient(90deg, var(--signal-dim), var(--signal));
  }
  .chapter.sent .fill.obs {
    background: var(--signal-dim);
  }
  .count {
    font-size: 11px;
    color: var(--text-dim);
  }
  .cfoot {
    display: flex;
    justify-content: flex-end;
    min-height: 30px;
    align-items: center;
  }
  .state {
    font-size: 9px;
  }
  .sent-tag {
    color: var(--signal-dim);
  }
  .uplink-btn.small {
    padding: 7px 16px;
    font-size: 10.5px;
    animation: ready 1.6s ease-in-out infinite;
  }
  @keyframes ready {
    50% {
      filter: brightness(1.15);
    }
  }

  .all-done {
    text-align: center;
    font-size: 13px;
    color: var(--text-dim);
    padding: 8px;
  }
  .ember {
    color: var(--ember-glow);
    font-weight: 600;
  }

  @media (max-width: 760px) {
    .recovery {
      grid-template-columns: 1fr;
      justify-items: start;
    }
    .rec-stat {
      align-items: flex-start;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .uplink-btn.small {
      animation: none;
    }
  }
</style>
