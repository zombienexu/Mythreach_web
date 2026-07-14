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
    denied,
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
    denied: Record<AbilityId, number>
    onactivate?: (id: AbilityId) => void
  } = $props()

  // Keep the last cast visible while the slot fades out.
  let lastCast: CastSnapshot | null = $state(null)
  $effect(() => {
    if (cast !== null) lastCast = cast
  })
  const shown = $derived(cast ?? lastCast)

  // The bar wears the colour of the spell in it. Charging Fireball should look
  // like fire gathering; charging Barrier should look like ice.
  const tone = $derived(shown ? `var(--tone-${shown.abilityId})` : 'var(--ether)')
  const nearly = $derived((cast?.progress ?? 0) > 0.82)
</script>

<div class="action-area">
  <!-- space is always reserved; only opacity changes, so the bar never reflows -->
  <div
    class="cast-slot"
    class:active={cast !== null}
    class:nearly
    style:--tone={tone}
    aria-hidden={cast === null}
  >
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
        denied={denied[id]}
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
    transition:
      opacity var(--dur-fast) ease,
      filter var(--dur-fast) ease;
  }

  .cast-slot.active {
    opacity: 1;
  }

  /* The last moments of a cast: the bar swells, and so does the tension. */
  .cast-slot.nearly {
    filter: drop-shadow(0 0 14px color-mix(in oklch, var(--tone) 65%, transparent));
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
    color: var(--tone);
    text-shadow: 0 0 16px color-mix(in oklch, var(--tone) 55%, transparent);
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
