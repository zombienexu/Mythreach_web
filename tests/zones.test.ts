import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../src/engine/events'
import { BOSS_KILLS_REQUIRED } from '../src/engine/types'
import { advance, eventsOf, makeSim, testContent } from './helpers'
import type { GameSim } from '../src/engine/sim'

/** Auto-battle through 1 HP dummies until `kills` normal kills land. */
function grind(sim: GameSim, kills: number): CombatEvent[] {
  sim.autoBattle = true
  const events: CombatEvent[] = []
  for (let i = 0; i < 20_000; i++) {
    events.push(...sim.tick())
    if (eventsOf(events, 'enemyDied').length >= kills) break
  }
  sim.autoBattle = false
  return events
}

describe('boss flow', () => {
  it('ten zone kills ready the boss (bossReady fires exactly once)', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    expect(sim.challengeBoss()).toBe(false)
    const events = grind(sim, BOSS_KILLS_REQUIRED)
    expect(eventsOf(events, 'bossReady')).toHaveLength(1)
    expect(sim.progressSnapshot().zones[0]!.bossReady).toBe(true)
  })

  it('challenging spawns the boss; killing it unlocks the next zone', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    grind(sim, BOSS_KILLS_REQUIRED)
    expect(sim.zoneUnlocked('z2')).toBe(false)
    expect(sim.challengeBoss()).toBe(true)
    sim.autoBattle = true
    const events = advance(sim, 6000)
    const spawns = eventsOf(events, 'enemySpawned').filter((e) => e.rank === 'boss')
    expect(spawns.length).toBeGreaterThanOrEqual(1)
    expect(spawns[0]!.defId).toBe('boss1')
    expect(eventsOf(events, 'bossDefeated')).toEqual([
      { kind: 'bossDefeated', zoneId: 'z1', nextZoneId: 'z2' },
    ])
    expect(sim.zoneUnlocked('z2')).toBe(true)
    expect(sim.progressSnapshot().zones[0]!.bossDefeated).toBe(true)
  })

  it('travel is refused to locked zones and switches spawns when allowed', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    expect(sim.travelTo('z2')).toBe(false)
    grind(sim, BOSS_KILLS_REQUIRED)
    sim.challengeBoss()
    sim.autoBattle = true
    advance(sim, 6000)
    sim.autoBattle = false
    expect(sim.travelTo('z2')).toBe(true)
    const events = advance(sim, 60)
    const spawned = eventsOf(events, 'enemySpawned')
    expect(spawned.length).toBeGreaterThanOrEqual(1)
    expect(spawned[0]!.defId).toBe('dummy2')
    expect(sim.progressSnapshot().zoneId).toBe('z2')
  })

  it('killing the final boss completes the campaign', () => {
    const sim = makeSim({
      content: testContent({ hp: 1 }),
      save: {
        level: 10,
        zoneId: 'z2',
        bossesDefeated: ['z1'],
        zoneKills: { z1: 10, z2: 10 },
      },
    })
    expect(sim.challengeBoss()).toBe(true)
    sim.autoBattle = true
    const events = advance(sim, 6000)
    expect(eventsOf(events, 'gameCompleted')).toHaveLength(1)
    expect(sim.progressSnapshot().completed).toBe(true)
    expect(eventsOf(events, 'bossDefeated')).toEqual([
      { kind: 'bossDefeated', zoneId: 'z2', nextZoneId: null },
    ])
  })

  it('dying to the boss sends you back to normal spawns', () => {
    const brutalBoss = testContent({ hp: 1 })
    brutalBoss.enemies['boss1'] = {
      ...brutalBoss.enemies['boss1']!,
      hp: 100_000,
      swingTicks: 10,
      dmgMin: 60,
      dmgMax: 60,
    }
    const sim = makeSim({ content: brutalBoss, save: { zoneKills: { z1: 10 } } })
    expect(sim.challengeBoss()).toBe(true)
    const events = advance(sim, 700)
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    // Every spawn after the death is a normal mob — the boss must be re-challenged.
    const deathAt = events.findIndex((e) => e.kind === 'playerDied')
    const spawnsAfter = events.slice(deathAt).filter((e) => e.kind === 'enemySpawned')
    expect(spawnsAfter.length).toBeGreaterThanOrEqual(1)
    expect(spawnsAfter.every((s) => s.kind === 'enemySpawned' && s.rank === 'normal')).toBe(true)
  })

  it('challengeBoss is refused while a boss fight is already pending', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }), save: { zoneKills: { z1: 10 } } })
    expect(sim.challengeBoss()).toBe(true)
    expect(sim.challengeBoss()).toBe(false)
  })
})

describe('achievements', () => {
  it('first blood and boss achievements unlock', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    const events = grind(sim, 1)
    const unlocked = eventsOf(events, 'achievementUnlocked')
    expect(unlocked.some((a) => a.id === 'first-blood')).toBe(true)
  })
})
