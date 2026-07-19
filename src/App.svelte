<script lang="ts">
  import { onMount } from 'svelte'
  import { Game } from './ui/game.svelte'
  import {
    applyMotion,
    loadSettings,
    touchProfile,
    writeProfile,
    type SlotId,
    type SlotProfile,
  } from './ui/profile'
  import Threshold from './ui/slice/Threshold.svelte'
  import UplinkShell from './ui/slice/UplinkShell.svelte'
  import CharacterCreation from './ui/title/CharacterCreation.svelte'
  import TitleScreen from './ui/title/TitleScreen.svelte'

  /** The front door: the title screen's three save slots. A returning slot goes
   *  straight into the world; a fresh one is named, projected through the
   *  Threshold, then entered. Each slot is its own account — save, profile, and
   *  Expedition all keyed per slot. */
  type Screen = 'title' | 'creation' | 'threshold' | 'game'

  let screen: Screen = $state('title')
  let game: Game | null = $state(null)
  let activeSlot: SlotId = $state(1)
  let creatingSlot: SlotId = $state(1)

  onMount(() => {
    applyMotion(loadSettings(localStorage))
  })

  /** Enter the world with an existing save. */
  function enter(slot: SlotId): void {
    touchProfile(localStorage, slot)
    activeSlot = slot
    game = new Game(slot)
    screen = 'game'
  }

  /** Begin naming a fresh conscript into an empty slot. */
  function create(slot: SlotId): void {
    creatingSlot = slot
    screen = 'creation'
  }

  /** The name is set — write the profile and project into the Ember Legion. */
  function begin(profile: SlotProfile): void {
    writeProfile(localStorage, creatingSlot, profile)
    activeSlot = creatingSlot
    screen = 'threshold'
  }

  /** The projection finished — boot the freshly-created slot. */
  function projected(): void {
    game = new Game(activeSlot)
    screen = 'game'
  }

  /** Hand control back to the title screen, flushing the save first so the
   *  slots read fresh the moment it mounts. */
  function exitToTitle(): void {
    game?.flush()
    game = null
    screen = 'title'
  }
</script>

{#if screen === 'title'}
  <TitleScreen onenter={enter} oncreate={create} />
{:else if screen === 'creation'}
  <CharacterCreation slot={creatingSlot} onback={() => (screen = 'title')} onbegin={begin} />
{:else if screen === 'threshold'}
  <Threshold ondone={projected} />
{:else if game}
  <UplinkShell {game} onexit={exitToTitle} />
{/if}
