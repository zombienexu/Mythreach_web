<script lang="ts">
  import { onMount } from 'svelte'
  import { Game } from './ui/game.svelte'
  import GameShell from './ui/GameShell.svelte'
  import {
    applyMotion,
    loadSettings,
    writeProfile,
    type SlotId,
    type SlotProfile,
  } from './ui/profile'
  import CharacterCreation from './ui/title/CharacterCreation.svelte'
  import TitleScreen from './ui/title/TitleScreen.svelte'

  /** The front door: title → (create) → game. The Game instance exists only
   *  while playing; unmounting the shell stops the loop and saves. */
  type Screen = 'title' | 'create' | 'game'

  let screen: Screen = $state('title')
  let slot: SlotId = $state(1)
  let game: Game | null = $state(null)

  onMount(() => applyMotion(loadSettings(localStorage)))

  function enter(s: SlotId): void {
    slot = s
    game = new Game(s)
    screen = 'game'
  }

  function create(s: SlotId): void {
    slot = s
    screen = 'create'
  }

  function begin(profile: SlotProfile): void {
    writeProfile(localStorage, slot, profile)
    enter(slot)
  }

  function exitToTitle(): void {
    // Flush first: the title screen reads the slots as it mounts, which can
    // happen before GameShell's unmount cleanup gets to save.
    game?.flush()
    screen = 'title'
    game = null
  }
</script>

{#if screen === 'title'}
  <TitleScreen onenter={enter} oncreate={create} />
{:else if screen === 'create'}
  <CharacterCreation {slot} onback={() => (screen = 'title')} onbegin={begin} />
{:else if game}
  <GameShell {game} onexit={exitToTitle} />
{/if}
