<script lang="ts">
  import type { ExpeditionSnapshot, NodeKind } from '../../engine'

  let { expedition }: { expedition: ExpeditionSnapshot } = $props()

  const GLYPH: Record<NodeKind | 'unknown', string> = {
    battle: '⚔',
    elite: '☠',
    cache: '✦',
    shrine: '❖',
    rest: '△',
    boss: '♛',
    unknown: '?',
  }

  // Marker position as a percentage across the ribbon. While travelling it
  // slides from the previous node toward the current one.
  const markerPct = $derived.by(() => {
    const total = expedition.total
    if (total <= 1) return 0
    const step = 100 / (total - 1)
    const i = expedition.index
    if (expedition.traveling && expedition.travelTotal > 0) {
      const done = 1 - expedition.travelRemaining / expedition.travelTotal
      return step * (i - 1 + done)
    }
    return step * i
  })
</script>

<div class="ribbon" aria-label="Expedition trail">
  <div class="track"></div>
  <div class="marker" style:left="{markerPct}%" aria-hidden="true"></div>
  {#each expedition.nodes as node, i (i)}
    <div
      class="node {node.state}"
      class:boss={node.kind === 'boss'}
      title={node.kind === 'unknown' ? 'Unknown' : node.kind}
    >
      <span class="glyph">{GLYPH[node.kind]}</span>
    </div>
  {/each}
</div>

<style>
  .ribbon {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    min-width: 180px;
    padding: 4px 6px 12px;
  }

  .track {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 50%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-edge, oklch(0.78 0.08 82 / 0.25)), transparent);
  }

  .node {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--void-deep);
    border: 1px solid oklch(0.5 0.04 80 / 0.4);
    color: var(--text-dim);
    font-size: 12px;
    transition: color var(--dur) ease, box-shadow var(--dur) ease, opacity var(--dur) ease;
  }

  .node.ahead {
    opacity: 0.5;
  }

  .node.done {
    opacity: 0.45;
  }

  .node.done::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, var(--text-dim) 0 2px, transparent 3px);
    opacity: 0.5;
  }

  .node.current {
    color: var(--gilt, oklch(0.78 0.1 85));
    border-color: var(--gilt, oklch(0.78 0.1 85));
    box-shadow: 0 0 12px -2px var(--gilt, oklch(0.78 0.1 85 / 0.7));
  }

  .node.boss {
    color: var(--ember);
    border-color: oklch(0.8 0.13 80 / 0.6);
  }

  .marker {
    position: absolute;
    top: 50%;
    width: 8px;
    height: 8px;
    margin-left: -4px;
    transform: translateY(-50%) rotate(45deg);
    background: var(--gilt, oklch(0.78 0.1 85));
    box-shadow: 0 0 8px var(--gilt, oklch(0.78 0.1 85 / 0.8));
    transition: left 120ms linear;
    z-index: 2;
  }
</style>
