<script lang="ts">
  import { onMount } from 'svelte'
  import Background from './ui/components/Background.svelte'
  import BossIntro from './ui/components/BossIntro.svelte'
  import CritFlash from './ui/components/CritFlash.svelte'
  import LevelUpBanner from './ui/components/LevelUpBanner.svelte'
  import OfflineModal from './ui/components/OfflineModal.svelte'
  import Sidebar from './ui/components/Sidebar.svelte'
  import Toast from './ui/components/Toast.svelte'
  import TopBar from './ui/components/TopBar.svelte'
  import VictoryModal from './ui/components/VictoryModal.svelte'
  import Vignette from './ui/components/Vignette.svelte'
  import { Game } from './ui/game.svelte'
  import AtlasView from './ui/views/AtlasView.svelte'
  import CharacterView from './ui/views/CharacterView.svelte'
  import ChronicleView from './ui/views/ChronicleView.svelte'
  import CombatView from './ui/views/CombatView.svelte'
  import TalentsView from './ui/views/TalentsView.svelte'

  const game = new Game()

  let shell: HTMLDivElement | undefined = $state()

  onMount(() => {
    game.start()
    // The whole page takes the hit, not just the card that got hit.
    if (shell) game.fx.attachShake(shell)
    return () => game.stop()
  })

  const TITLES: Record<typeof game.view, string> = {
    combat: 'Combat',
    character: 'Character',
    talents: 'Talents',
    atlas: 'Atlas',
    chronicle: 'Chronicle',
  }

  const zone = $derived(game.progress.zones.find((z) => z.current))
</script>

<Background />
<div class="app" bind:this={shell}>
  <Sidebar
    view={game.view}
    level={game.progress.level}
    xp={game.progress.xp}
    xpToNext={game.progress.xpToNext}
    talentPoints={game.progress.talentPoints}
    onnavigate={(v) => game.setView(v)}
  />
  <main class="main">
    <TopBar
      title={TITLES[game.view]}
      zoneName={zone?.name ?? ''}
      zoneHue={zone?.hue ?? 260}
      kills={game.progress.lifetime.kills}
      gold={game.progress.gold}
      auto={game.auto}
      muted={game.muted}
      ontoggleauto={() => game.toggleAuto()}
      ontogglemute={() => game.toggleMute()}
    />

    {#if game.view === 'combat'}
      <CombatView {game} />
    {:else if game.view === 'character'}
      <CharacterView {game} />
    {:else if game.view === 'talents'}
      <TalentsView {game} />
    {:else if game.view === 'atlas'}
      <AtlasView {game} />
    {:else}
      <ChronicleView {game} />
    {/if}
  </main>
</div>

<Vignette combat={game.combat} />

{#if game.critFlash.n > 0}
  {#key game.critFlash.n}
    <CritFlash power={game.critFlash.power} side={game.critFlash.side} />
  {/key}
{/if}

{#if game.bossIntro}
  {#key game.bossIntro}
    <BossIntro
      name={game.bossIntro}
      onslam={() => game.fx.shaker.punch(10, 0.6)}
      ondone={() => game.dismissBossIntro()}
    />
  {/key}
{/if}

{#if game.banner}
  <LevelUpBanner level={game.banner.level} unlocked={game.banner.unlocked} />
{/if}

{#if game.toast}
  {#key game.toast.id}
    <Toast title={game.toast.title} body={game.toast.body} />
  {/key}
{/if}

{#if game.offline}
  <OfflineModal summary={game.offline} onclose={() => game.dismissOffline()} />
{/if}

{#if game.victory}
  <VictoryModal lifetime={game.progress.lifetime} onclose={() => game.dismissVictory()} />
{/if}

<style>
  .app {
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr);
    min-height: 100dvh;
  }

  .main {
    width: min(1060px, 100%);
    margin-inline: auto;
    padding: 26px 34px 30px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-height: 100dvh;
  }

  @media (max-width: 1000px) {
    .app {
      grid-template-columns: 196px minmax(0, 1fr);
    }

    .main {
      padding: 20px 22px 24px;
    }
  }
</style>
