<script lang="ts">
  import { onMount } from 'svelte'
  import Background from './components/Background.svelte'
  import BossIntro from './components/BossIntro.svelte'
  import CritFlash from './components/CritFlash.svelte'
  import LevelUpBanner from './components/LevelUpBanner.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import Toast from './components/Toast.svelte'
  import TopBar from './components/TopBar.svelte'
  import Vignette from './components/Vignette.svelte'
  import type { Game } from './game.svelte'
  import { loadSettings } from './profile'
  import AtlasView from './views/AtlasView.svelte'
  import CharacterView from './views/CharacterView.svelte'
  import ChronicleView from './views/ChronicleView.svelte'
  import CombatView from './views/CombatView.svelte'
  import QuestsView from './views/QuestsView.svelte'
  import SettingsView from './views/SettingsView.svelte'
  import TalentsView from './views/TalentsView.svelte'

  let { game, onexit }: { game: Game; onexit: () => void } = $props()

  let shell: HTMLDivElement | undefined = $state()

  onMount(() => {
    game.start()
    // The whole page takes the hit, not just the card that got hit —
    // unless the player asked the map to hold still.
    if (shell && loadSettings(localStorage).shake) game.fx.attachShake(shell)
    return () => game.stop()
  })

  const TITLES: Record<typeof game.view, string> = {
    combat: 'Combat',
    character: 'Character',
    talents: 'Talents',
    regions: 'Regions',
    quests: 'Quests',
    chronicle: 'Chronicle',
    settings: 'Settings',
  }

  const region = $derived(game.progress.regions.find((r) => r.current))
</script>

<Background hue={region?.hue ?? 260} />
<div class="app" style:--rh={region?.hue ?? 260} bind:this={shell}>
  <Sidebar
    view={game.view}
    level={game.progress.level}
    xp={game.progress.xp}
    xpToNext={game.progress.xpToNext}
    talentPoints={game.progress.talentPoints}
    questsReady={game.progress.quests.filter((q) => q.state === 'complete').length}
    onnavigate={(v) => game.setView(v)}
  />
  <main class="main">
    <TopBar
      title={TITLES[game.view]}
      zoneName={region?.name ?? ''}
      zoneHue={region?.hue ?? 260}
      kills={game.progress.lifetime.kills}
      gold={game.progress.gold}
      auto={game.auto}
      muted={game.muted}
      ontoggleauto={() => game.toggleAuto()}
      ontogglemute={() => game.toggleMute()}
    />

    {#key game.view}
      <div class="view">
        {#if game.view === 'combat'}
          <CombatView {game} />
        {:else if game.view === 'character'}
          <CharacterView {game} />
        {:else if game.view === 'talents'}
          <TalentsView {game} />
        {:else if game.view === 'regions'}
          <AtlasView {game} />
        {:else if game.view === 'quests'}
          <QuestsView {game} />
        {:else if game.view === 'settings'}
          <SettingsView {game} {onexit} />
        {:else}
          <ChronicleView {game} />
        {/if}
      </div>
    {/key}
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

  /* Turning to a new page of the atlas: the view settles up out of the dark. */
  .view {
    display: flex;
    flex-direction: column;
    gap: 22px;
    flex: 1;
    min-height: 0;
    animation: view-in var(--dur-slow) var(--ease-out-expo);
  }

  @keyframes view-in {
    from {
      opacity: 0;
      transform: translateY(10px);
      filter: brightness(1.3);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .view {
      animation: none;
    }
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
