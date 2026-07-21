<script lang="ts">
  import type { Game } from '../../game.svelte'
  import { FRONTS, GRACE_TIERS } from '../content'

  let { game }: { game: Game } = $props()

  const ex = $derived(game.expedition)

  // Threat is display-only: RegionTier has just low/medium/hard, so the deep
  // end-game fronts read their intensity off the level band instead.
  function threatPips(tier: string, minLevel: number): number {
    let pips = tier === 'low' ? 1 : tier === 'medium' ? 2 : 3
    if (minLevel >= 16) pips = 4
    if (minLevel >= 19) pips = 5
    if (minLevel >= 22) pips = 6
    return pips
  }
  const THREAT_WORD = ['—', 'Skirmish', 'Contested', 'Perilous', 'Brutal', 'Dire', 'Apocalyptic']

  const fronts = $derived(
    FRONTS.map((f) => {
      const region = game.progress.regions.find((r) => r.id === f.regionId)
      const minLevel = region?.minLevel ?? 1
      const pips = threatPips(region?.tier ?? 'low', minLevel)
      return {
        ...f,
        name: region?.name ?? f.regionId,
        epithet: region?.epithet ?? '',
        tier: region?.tier ?? 'low',
        band: region ? `Lv ${region.minLevel}–${region.maxLevel}` : '',
        hue: region?.hue ?? 40,
        open: ex.frontOpen(f.tierIndex),
        current: region?.current ?? false,
        opensAt: GRACE_TIERS[f.tierIndex]?.name ?? '',
        pips,
        threat: THREAT_WORD[pips],
      }
    }),
  )
</script>

<div class="atlas">
  <section class="panel console-panel ticked">
    <header class="phead">
      <span class="readout">warfront atlas · the ember legion deploys you as it learns to trust you</span>
    </header>
    <div class="fronts">
      {#each fronts as f (f.regionId)}
        <button
          class="front"
          class:current={f.current}
          class:locked={!f.open}
          style:--fh={f.hue}
          disabled={!f.open || f.current}
          onclick={() => game.enterRegion(f.regionId)}
        >
          <div class="front-top">
            <span class="front-name">{f.name}</span>
            {#if f.current}<span class="front-tag now">deployed</span>
            {:else if !f.open}<span class="front-tag lock">opens · {f.opensAt}</span>
            {:else}<span class="front-tag go">deploy ▸</span>{/if}
          </div>
          <span class="front-sub">{f.open ? f.epithet : '████████'}</span>
          <div class="front-meta">
            <span class="band mono">{f.band}</span>
            <span class="threat">
              <span class="threat-word">{f.open ? f.threat : '——'}</span>
              <span class="pips" aria-label="threat {f.pips} of 6">
                {#each Array(6) as _pip, i (i)}
                  <span class="pip" class:on={f.open && i < f.pips}></span>
                {/each}
              </span>
            </span>
          </div>
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .atlas {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .phead {
    margin-bottom: 12px;
  }
  .fronts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 10px;
  }
  .front {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    padding: 13px 15px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--console-line);
    background: linear-gradient(180deg, oklch(0.62 0.12 var(--fh) / 0.06), oklch(0.5 0.03 250 / 0.02));
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast),
      transform var(--dur-fast);
  }
  .front:not(:disabled):hover {
    border-color: oklch(0.7 0.14 var(--fh) / 0.7);
    transform: translateY(-2px);
  }
  .front.current {
    border-color: var(--ember-war);
    box-shadow: inset 2px 0 0 var(--ember-war);
    cursor: default;
  }
  .front.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .front-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .front-name {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--text);
  }
  .front-tag {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .front-tag.now {
    color: var(--ember-glow);
  }
  .front-tag.lock {
    color: var(--signal-dim);
  }
  .front-tag.go {
    color: var(--signal);
  }
  .front-sub {
    font-size: 11.5px;
    font-style: italic;
    color: var(--text-dim);
  }
  .front-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 2px;
  }
  .band {
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .threat {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .threat-word {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: oklch(0.72 0.14 var(--fh));
  }
  .pips {
    display: inline-flex;
    gap: 2px;
  }
  .pip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    border: 1px solid oklch(0.7 0.12 var(--fh) / 0.4);
  }
  .pip.on {
    background: oklch(0.7 0.16 var(--fh));
    box-shadow: 0 0 6px oklch(0.7 0.16 var(--fh) / 0.6);
  }
</style>
