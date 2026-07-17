<script lang="ts">
  import { CLASS_BY_ID, ORIGIN_BY_ID, SIGN_BY_ID } from '../content/identity'
  import type { Game } from '../game.svelte'

  let { game, onexit }: { game: Game; onexit: () => void } = $props()

  let confirming: 'new' | 'delete' | null = $state(null)

  const region = $derived(game.progress.regions.find((r) => r.current))
  const p = $derived(game.progress)
  const cls = $derived(CLASS_BY_ID[game.profile?.classId ?? 'arcanist'])
  const origin = $derived(game.profile ? ORIGIN_BY_ID[game.profile.originId] : undefined)
  const sign = $derived(game.profile ? SIGN_BY_ID[game.profile.signId] : undefined)
</script>

<div class="stack">
  <section class="glass pane" aria-label="Current character">
    <h2>{game.profile?.name ?? 'The Arcanist'}</h2>
    <p class="sub">
      {cls.name} — save slot {game.slot}. Your save lives in this browser and autosaves as you play.
      {#if origin || sign}
        <br />{origin?.name ?? ''}{origin && sign ? ', born under ' : ''}{sign?.name ?? ''}.
      {/if}
    </p>
    <div class="facts">
      <div class="fact"><span class="k">Level</span><span class="v num">{p.level}</span></div>
      <div class="fact"><span class="k">Gold</span><span class="v num">{p.gold.toLocaleString()}</span></div>
      <div class="fact"><span class="k">Region</span><span class="v">{region?.name ?? '—'}</span></div>
      <div class="fact"><span class="k">Kills</span><span class="v num">{p.lifetime.kills.toLocaleString()}</span></div>
      <div class="fact"><span class="k">Deaths</span><span class="v num">{p.lifetime.deaths.toLocaleString()}</span></div>
      <div class="fact"><span class="k">Epics found</span><span class="v num">{p.lifetime.epicsFound}</span></div>
    </div>
  </section>

  <section class="glass pane" aria-label="Leave the table">
    <h3>Step away</h3>
    <p class="warn-text">Back to the title screen — the run is saved on the way out.</p>
    <div class="row">
      <button class="btn" onclick={onexit}>Return to title</button>
    </div>
  </section>

  <section class="glass pane danger" aria-label="Character management">
    <h3>Start over</h3>
    <p class="warn-text">
      Both actions erase this save and drop you back at level 1 with nothing. There is no undo.
    </p>

    {#if confirming === null}
      <div class="row">
        <button class="btn" onclick={() => (confirming = 'new')}>Start a new character</button>
        <button class="btn wound" onclick={() => (confirming = 'delete')}>Delete save</button>
      </div>
    {:else}
      <div class="confirm">
        <span class="confirm-q">
          {confirming === 'new' ? 'Abandon this character and begin anew?' : 'Erase this save for good?'}
        </span>
        <div class="row">
          <button
            class="btn wound"
            onclick={() => (confirming === 'new' ? game.newCharacter() : game.deleteSave())}
          >
            Yes, erase everything
          </button>
          <button class="btn" onclick={() => (confirming = null)}>Keep playing</button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 720px;
  }

  .pane {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h2 {
    font-size: 19px;
  }

  h3 {
    font-size: 13px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .sub {
    margin: -6px 0 0;
    font-size: 13px;
    color: var(--text-dim);
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .fact {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  .k {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .v {
    font-size: 16px;
    font-weight: 620;
    color: var(--ether);
  }

  .danger {
    border-top: 2px solid oklch(0.6 0.18 25 / 0.5);
  }

  .warn-text {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }

  .confirm {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .confirm-q {
    font-size: 13.5px;
    color: var(--text);
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 640;
    cursor: pointer;
    color: var(--text);
    border: 1px solid oklch(0.85 0.03 260 / 0.18);
    background: oklch(0.8 0.02 260 / 0.05);
    transition: box-shadow var(--dur-fast) ease, border-color var(--dur-fast) ease;
  }

  .btn:hover {
    border-color: oklch(0.8 0.11 195 / 0.5);
  }

  .btn.wound {
    color: oklch(0.72 0.17 25);
    border-color: oklch(0.6 0.18 25 / 0.4);
  }

  .btn.wound:hover {
    border-color: oklch(0.6 0.18 25 / 0.7);
    box-shadow: 0 0 14px -4px oklch(0.6 0.18 25 / 0.6);
  }
</style>
