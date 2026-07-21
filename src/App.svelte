<script lang="ts">
  import { onMount } from 'svelte'
  import { Game } from './ui/game.svelte'
  import { applyMotion, eraseSlot, loadSettings, writeProfile, type SlotId } from './ui/profile'
  import Arrival from './ui/slice/Arrival.svelte'
  import { SLICE_IDENTITY, type WorldOption } from './ui/slice/content'
  import OpeningSequence from './ui/slice/OpeningSequence.svelte'
  import UplinkShell from './ui/slice/UplinkShell.svelte'
  import WorldSelect from './ui/slice/WorldSelect.svelte'
  import CharacterCreation from './ui/title/CharacterCreation.svelte'
  import TitleScreen from './ui/title/TitleScreen.svelte'

  /** The front door and the pre-game onboarding. A returning slot goes straight
   *  into the world. A fresh one is named (name only), watches the opening
   *  sequence — which grants the first Codex directive — chooses a world at the
   *  Projection Station (the calling is finalized here), then is met on the
   *  muster ground by the instructor before the uplink drops into the game. */
  type Screen = 'title' | 'creation' | 'opening' | 'world' | 'arrival' | 'game'

  let screen: Screen = $state('title')
  let game: Game | null = $state(null)
  let activeSlot: SlotId = $state(1)
  let creatingSlot: SlotId = $state(1)
  /** the name taken at creation, held until the profile is finalized at the world station */
  let draftName = $state('')

  onMount(() => {
    applyMotion(loadSettings(localStorage))
  })

  /** Boot a slot into the game. A fresh Expedition is marked mustered — the
   *  arrival screen has already delivered the sergeant's welcome, and the
   *  Kindle Yard (the camp script) takes it from here. */
  function mount(slot: SlotId): void {
    const g = new Game(slot)
    g.expedition.markBriefed()
    activeSlot = slot
    game = g
    screen = 'game'
  }

  /** Enter the world with an existing save. */
  function enter(slot: SlotId): void {
    mount(slot)
  }

  /** Begin naming a fresh conscript into an empty slot. Clear any residual
   *  state in the slot first — chiefly an orphaned expedition (Standing /
   *  Codex / Kindle Yard progress) left by a prior character — so the new
   *  conscript truly starts at the camp gate and never inherits an old run's
   *  "already briefed" meta, which would skip the yard and pre-grant Fireball. */
  function create(slot: SlotId): void {
    eraseSlot(localStorage, slot)
    creatingSlot = slot
    draftName = ''
    screen = 'creation'
  }

  /** The name is set — hold it and roll the opening sequence. */
  function named(name: string): void {
    draftName = name
    screen = 'opening'
  }

  /** The opening sequence granted the Codex directive — choose a world. */
  function openingDone(): void {
    screen = 'world'
  }

  /** A world was chosen — finalize the profile's calling, then arrive. */
  function chooseWorld(world: WorldOption): void {
    const now = Date.now()
    writeProfile(localStorage, creatingSlot, {
      name: draftName,
      classId: world.classId ?? SLICE_IDENTITY.classId,
      originId: SLICE_IDENTITY.originId,
      signId: SLICE_IDENTITY.signId,
      createdAt: now,
      playedAt: now,
    })
    activeSlot = creatingSlot
    screen = 'arrival'
  }

  /** The first charge is accepted — drop into the game. */
  function acceptCharge(): void {
    mount(activeSlot)
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
  <CharacterCreation slot={creatingSlot} onback={() => (screen = 'title')} onname={named} />
{:else if screen === 'opening'}
  <OpeningSequence ondone={openingDone} />
{:else if screen === 'world'}
  <WorldSelect onselect={chooseWorld} onback={() => (screen = 'opening')} />
{:else if screen === 'arrival'}
  <Arrival name={draftName} onaccept={acceptCharge} />
{:else if game}
  <UplinkShell {game} onexit={exitToTitle} />
{/if}
