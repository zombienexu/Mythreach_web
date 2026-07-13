<script lang="ts">
  import { onMount } from 'svelte'
  import ActionBar from './ui/components/ActionBar.svelte'
  import Background from './ui/components/Background.svelte'
  import CombatantCard from './ui/components/CombatantCard.svelte'
  import CombatLog from './ui/components/CombatLog.svelte'
  import Sidebar from './ui/components/Sidebar.svelte'
  import TopBar from './ui/components/TopBar.svelte'
  import { Game } from './ui/game.svelte'

  const game = new Game()

  onMount(() => {
    game.start()
    return () => game.stop()
  })

  const playerFloats = $derived(game.floats.filter((f) => f.side === 'player'))
  const enemyFloats = $derived(game.floats.filter((f) => f.side === 'enemy'))
</script>

<Background />
<div class="app">
  <Sidebar />
  <main class="main">
    <TopBar kills={game.snap.kills} gold={game.snap.gold} />
    <section class="arena" aria-label="Combatants">
      <CombatantCard
        side="player"
        name="Hero"
        combatant={game.snap.player}
        floats={playerFloats}
        impact={game.impacts.player}
        bloom={game.bloom}
      />
      <CombatantCard
        side="enemy"
        name="Cave Golem"
        combatant={game.snap.enemy}
        swingProgress={game.snap.swingProgress}
        dot={game.snap.dot}
        floats={enemyFloats}
        impact={game.impacts.enemy}
      />
    </section>
    <CombatLog entries={game.log} />
    <div class="foot">
      <ActionBar
        cast={game.snap.cast}
        cooldowns={game.snap.cooldowns}
        usable={game.usable}
        pressedKeys={game.pressed}
        onactivate={(id) => game.use(id)}
      />
    </div>
  </main>
</div>

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

  .arena {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  /* pin the action bar toward the bottom of the viewport */
  .foot {
    margin-top: auto;
    padding-block: 10px 4px;
  }

  @media (max-width: 1000px) {
    .app {
      grid-template-columns: 196px minmax(0, 1fr);
    }

    .main {
      padding: 20px 22px 24px;
    }

    .arena {
      gap: 14px;
    }
  }
</style>
