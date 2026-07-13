<script lang="ts">
  import { ABILITIES, ABILITY_IDS, type AbilityId, type CastSnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import AbilityButton from './AbilityButton.svelte'
  import Bar from './Bar.svelte'

  let {
    cast,
    queued,
    cooldowns,
    gcd,
    usable,
    unlocked,
    mana,
    pressedKeys,
    onactivate,
  }: {
    cast: CastSnapshot | null
    queued: AbilityId | null
    cooldowns: Record<AbilityId, number>
    gcd: number
    usable: Record<AbilityId, boolean>
    unlocked: AbilityId[]
    mana: number
    pressedKeys: ReadonlySet<string>
    onactivate?: (id: AbilityId) => void
  } = $props()

  // Keep the last cast visible while the slot fades out.
  let lastCast: CastSnapshot | null = $state(null)
  $effect(() => {
    if (cast !== null) lastCast = cast
  })
  const shown = $derived(cast ?? lastCast)
</script>

<div class="action-area">
  <!-- space is always reserved; only opacity changes, so the bar never reflows -->
  <div class="cast-slot" class:active={cast !== null} aria-hidden={cast === null}>
    <div class="cast-head">
      <span class="cast-name">{shown ? ABILITIES[shown.abilityId].name : ' '}</span>
      <span class="cast-time num">{shown ? `${ticksToSeconds(shown.remainingTicks)}s` : ' '}</span>
    </div>
    <Bar value={shown?.progress ?? 0} max={1} kind="cast" height={12} label="Cast progress" />
  </div>

  <div class="buttons" role="toolbar" aria-label="Abilities">
    {#each ABILITY_IDS as id (id)}
      <AbilityButton
        def={ABILITIES[id]}
        cooldown={cooldowns[id]}
        usable={usable[id]}
        locked={!unlocked.includes(id)}
        casting={cast?.abilityId === id}
        queued={queued === id}
        {gcd}
        {mana}
        pressed={pressedKeys.has(ABILITIES[id].key)}
        onactivate={() => onactivate?.(id)}
      />
    {/each}
  </div>
</div>

<style>
  .action-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .cast-slot {
    width: 320px;
    opacity: 0;
    transition: opacity var(--dur-fast) ease;
  }

  .cast-slot.active {
    opacity: 1;
  }

  .cast-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
    min-height: 20px;
  }

  .cast-name {
    font-family: var(--font-display);
    font-size: 14.5px;
    letter-spacing: 0.03em;
    color: var(--ether);
  }

  .cast-time {
    font-size: 12px;
    color: var(--text-dim);
  }

  .buttons {
    display: flex;
    gap: 12px;
  }

  @media (max-width: 1000px) {
    .buttons {
      gap: 8px;
    }
  }
</style>
