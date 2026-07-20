<script lang="ts">
  import { CARDS, type ClassId, type ClassResourceSnapshot } from '../../engine'
  import { CLASS_BY_ID } from '../content/identity'
  import { ticksToSeconds } from '../format'

  let {
    resource,
    echo,
    classId,
  }: {
    resource: ClassResourceSnapshot | null
    echo: { name: string; swingProgress: number; remainingTicks: number } | null
    classId: ClassId
  } = $props()

  const hue = $derived(CLASS_BY_ID[classId].hue)
  const mechanic = $derived(CLASS_BY_ID[classId].mechanic.name)

  // The debt meter turns urgent as the Reckoning closes in.
  const urgent = $derived(
    resource?.kind === 'debt' && resource.debt > 0 && resource.reckoningIn > 0 && resource.reckoningIn < 100,
  )
</script>

<!-- Height is reserved even for resource-less callings, so the action bar
     never hops when an echo chip appears. -->
<div class="resource" style:--ch={hue} aria-label="Class resource">
  {#if resource?.kind === 'ledger'}
    <span class="label">{mechanic}</span>
    <span class="pips" role="img" aria-label="{resource.pages} of {resource.cap} pages">
      {#each Array.from({ length: resource.cap }) as _, i (i)}
        <svg class="page" class:lit={i < resource.pages} viewBox="0 0 12 14" aria-hidden="true">
          <path d="M2 1.5 H8.5 L10.5 3.5 V12.5 H2 Z" fill={i < resource.pages ? 'oklch(0.75 0.1 135 / 0.35)' : 'none'} stroke="currentColor" stroke-width="1.1" />
          <path d="M4 6 H8.5 M4 8.5 H8.5" stroke="currentColor" stroke-width="0.9" opacity="0.7" />
        </svg>
      {/each}
    </span>
    {#if resource.buried}
      <span class="detail">last buried: <em>{resource.buried}</em></span>
    {/if}
  {:else if resource?.kind === 'debt'}
    <span class="label">{mechanic}</span>
    <span class="meter" class:urgent role="img" aria-label="Sand debt {resource.debt} of 100">
      <span class="fill" style:width="{resource.debt}%"></span>
    </span>
    <span class="detail num">{resource.debt}</span>
    {#if resource.reckoningIn > 0}
      <span class="detail" class:urgent-text={urgent}>
        reckoning in {ticksToSeconds(resource.reckoningIn)}s
      </span>
    {/if}
  {:else if resource?.kind === 'hand'}
    <span class="label">{mechanic}</span>
    {#if resource.cards.length === 0}
      <span class="detail">an empty hand — Deal Fate draws three</span>
    {:else}
      <span class="cards">
        {#each resource.cards as card, i (i)}
          <span class="card" class:top={i === 0} title={CARDS[card].name}>{CARDS[card].name}</span>
        {/each}
      </span>
    {/if}
  {:else if resource?.kind === 'growth'}
    <span class="label">{mechanic}</span>
    {#if resource.perTick > 0}
      <span class="detail">briar grown to <span class="num">{resource.perTick}</span> a tick — {ticksToSeconds(resource.remainingTicks)}s of bloom left</span>
    {:else}
      <span class="detail">nothing planted on this one yet</span>
    {/if}
  {:else if resource?.kind === 'charge'}
    <span class="label">{mechanic}</span>
    <span class="pips" role="img" aria-label="{resource.charge} of {resource.cap} rift charges">
      {#each Array.from({ length: resource.cap }) as _, i (i)}
        <svg class="shard" class:lit={i < resource.charge} viewBox="0 0 10 14" aria-hidden="true">
          <path d="M5 1 L8.5 7 L5 13 L1.5 7 Z" fill={i < resource.charge ? 'oklch(0.72 0.15 305 / 0.4)' : 'none'} stroke="currentColor" stroke-width="1.1" />
        </svg>
      {/each}
    </span>
  {/if}

  {#if echo}
    <span class="echo" title="Fighting beside you">
      <span class="echo-dot" aria-hidden="true"></span>
      {echo.name} — {ticksToSeconds(echo.remainingTicks)}s
    </span>
  {/if}
</div>

<style>
  .resource {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 22px;
    flex-wrap: wrap;
    padding: 4px 12px;
    border-radius: 12px;
    border: 1px solid oklch(0.75 0.1 var(--ch) / 0.16);
    background: linear-gradient(180deg, oklch(0.16 0.03 300 / 0.4), oklch(0.1 0.035 305 / 0.5));
  }

  .label {
    font-size: 10px;
    font-weight: 660;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: oklch(0.75 0.1 var(--ch) / 0.9);
  }

  .detail {
    font-size: 11.5px;
    color: var(--text-dim);
  }

  .detail em {
    font-style: italic;
    color: var(--text);
  }

  .pips {
    display: inline-flex;
    gap: 4px;
    color: oklch(0.75 0.11 var(--ch));
  }

  .page,
  .shard {
    width: 13px;
    height: 15px;
    opacity: 0.35;
    transition: opacity var(--dur-fast) ease, filter var(--dur-fast) ease;
  }

  .page.lit,
  .shard.lit {
    opacity: 1;
    filter: drop-shadow(0 0 5px oklch(0.75 0.12 var(--ch) / 0.7));
  }

  .meter {
    position: relative;
    width: 130px;
    height: 8px;
    border-radius: 99px;
    overflow: hidden;
    background: oklch(0.3 0.02 270 / 0.8);
    border: 1px solid oklch(0.85 0.03 260 / 0.15);
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, oklch(0.7 0.1 var(--ch)), oklch(0.8 0.13 var(--ch)));
    transition: width 180ms ease;
  }

  .meter.urgent .fill {
    background: linear-gradient(90deg, oklch(0.68 0.17 25), oklch(0.78 0.16 40));
    animation: debt-throb 0.9s ease-in-out infinite;
  }

  .urgent-text {
    color: var(--wound);
    font-weight: 620;
  }

  @keyframes debt-throb {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.5);
    }
  }

  .cards {
    display: inline-flex;
    gap: 5px;
  }

  .card {
    font-size: 10.5px;
    font-weight: 620;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid oklch(0.75 0.1 var(--ch) / 0.35);
    background: oklch(0.7 0.08 var(--ch) / 0.07);
    color: var(--text-dim);
    animation: card-in 200ms var(--ease-spring) both;
  }

  .card.top {
    color: oklch(0.85 0.1 var(--ch));
    border-color: oklch(0.78 0.12 var(--ch) / 0.7);
    box-shadow: 0 0 10px -3px oklch(0.75 0.12 var(--ch) / 0.6);
  }

  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  .echo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 99px;
    border: 1px solid oklch(0.75 0.1 var(--ch) / 0.4);
    color: oklch(0.82 0.09 var(--ch));
    background: oklch(0.7 0.08 var(--ch) / 0.06);
    animation: card-in 200ms var(--ease-spring) both;
  }

  .echo-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: oklch(0.8 0.12 var(--ch));
    box-shadow: 0 0 8px oklch(0.8 0.12 var(--ch) / 0.8);
    animation: echo-pulse 1.4s ease-in-out infinite;
  }

  @keyframes echo-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .echo,
    .echo-dot,
    .meter.urgent .fill {
      animation: none;
    }
  }
</style>
