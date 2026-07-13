<script lang="ts">
  import type { AbilityId } from './engine'
  import ActionBar from './ui/components/ActionBar.svelte'
  import Background from './ui/components/Background.svelte'
  import CombatantCard from './ui/components/CombatantCard.svelte'
  import CombatLog, { type LogEntry } from './ui/components/CombatLog.svelte'
  import Sidebar from './ui/components/Sidebar.svelte'
  import TopBar from './ui/components/TopBar.svelte'

  // M2: static mock data for the shell review. M3 replaces this with the live store.
  const kills = 12
  const gold = 120
  const player = { hp: 72, maxHp: 100, alive: true, respawnIn: 0 }
  const enemy = { hp: 44, maxHp: 80, alive: true, respawnIn: 0 }
  const swingProgress = 0.62
  const dot = { abilityId: 'ignite' as const, remainingTicks: 84 }
  const cast = { abilityId: 'fireball' as const, progress: 0.58, remainingTicks: 21 }
  const cooldowns: Record<AbilityId, number> = { fireball: 0, ignite: 96, renew: 0 }
  const usable: Record<AbilityId, boolean> = { fireball: false, ignite: false, renew: false }
  const pressedKeys = new Set<string>()
  const entries: LogEntry[] = [
    { id: 1, time: '0.0s', text: 'A Cave Golem lumbers out of the dark.', tone: 'info' },
    { id: 2, time: '1.2s', text: 'Ignite sears the Cave Golem.', tone: 'arcana' },
    { id: 3, time: '2.2s', text: 'Ignite burns the Cave Golem for 4.', tone: 'arcana' },
    { id: 4, time: '2.6s', text: 'Fireball hits the Cave Golem for 21.', tone: 'player' },
    { id: 5, time: '3.4s', text: 'Cave Golem hits you for 7.', tone: 'enemy' },
    { id: 6, time: '4.1s', text: 'Renew restores 23 health.', tone: 'heal' },
    { id: 7, time: '5.8s', text: 'Cave Golem dies. +10 gold.', tone: 'gold' },
  ]
</script>

<Background />
<div class="app">
  <Sidebar />
  <main class="main">
    <TopBar {kills} {gold} />
    <section class="arena" aria-label="Combatants">
      <CombatantCard side="player" name="Hero" combatant={player} />
      <CombatantCard side="enemy" name="Cave Golem" combatant={enemy} {swingProgress} {dot} />
    </section>
    <CombatLog {entries} />
    <div class="foot">
      <ActionBar {cast} {cooldowns} {usable} {pressedKeys} />
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
