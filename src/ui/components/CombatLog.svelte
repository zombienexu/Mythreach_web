<script lang="ts">
  export interface LogEntry {
    id: number
    time: string
    text: string
    tone: 'player' | 'enemy' | 'heal' | 'gold' | 'arcana' | 'info'
  }

  let { entries }: { entries: LogEntry[] } = $props()

  let scroller: HTMLDivElement | undefined = $state()

  $effect(() => {
    entries.length // track
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  })
</script>

<section class="glass log" aria-label="Combat log">
  <h2>Combat log</h2>
  <div class="scroller" bind:this={scroller}>
    <ul aria-live="polite">
      {#each entries as entry (entry.id)}
        <li class={entry.tone}>
          <span class="time num">{entry.time}</span>
          <span class="text">{entry.text}</span>
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .log {
    display: flex;
    flex-direction: column;
    padding: 16px 22px 12px;
    height: 190px;
  }

  h2 {
    font-size: 13px;
    font-weight: 560;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .scroller {
    overflow-y: auto;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: oklch(0.68 0.02 260 / 0.3) transparent;
    mask-image: linear-gradient(180deg, transparent 0, #fff 14px);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  li {
    display: flex;
    gap: 12px;
    font-size: 13.5px;
    animation: enter 300ms ease both;
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  .time {
    color: var(--text-dim);
    opacity: 0.6;
    font-size: 12px;
    flex: none;
    width: 44px;
    text-align: right;
    line-height: 1.65;
  }

  .player .text {
    color: var(--ether);
  }
  .enemy .text {
    color: var(--wound);
  }
  .heal .text {
    color: var(--life);
  }
  .gold .text {
    color: var(--ember);
  }
  .arcana .text {
    color: var(--arcana);
  }
  .info .text {
    color: var(--text-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    li {
      animation: none;
    }
  }
</style>
