import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../src/engine/events'
import type { GameSim } from '../src/engine/sim'
import { advance, eventsOf, makeSim, testContent } from './helpers'

/** Auto-battle a full expedition (hands-free embark/advance) until `n`
 *  expeditions have completed, or we give up. */
function runExpeditions(sim: GameSim, n: number): CombatEvent[] {
  sim.autoBattle = true
  const events: CombatEvent[] = []
  for (let i = 0; i < 40_000; i++) {
    events.push(...sim.tick())
    if (eventsOf(events, 'expeditionEnded').filter((e) => e.outcome === 'completed').length >= n) break
  }
  sim.autoBattle = false
  return events
}

describe('zone flow via expeditions', () => {
  it('completing the zone-1 expedition unlocks zone 2', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1 }) })
    expect(sim.zoneUnlocked('z2')).toBe(false)
    const events = runExpeditions(sim, 1)
    expect(eventsOf(events, 'bossDefeated')).toEqual([
      { kind: 'bossDefeated', zoneId: 'z1', nextZoneId: 'z2' },
    ])
    expect(sim.zoneUnlocked('z2')).toBe(true)
    expect(sim.progressSnapshot().zones[0]!.bossDefeated).toBe(true)
  })

  it('travelTo is refused mid-expedition and to locked zones, allowed from camp', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1 }) })
    expect(sim.travelTo('z2')).toBe(false) // locked
    sim.embark()
    expect(sim.travelTo('z2')).toBe(false) // mid-expedition
    sim.retreat()
    runExpeditions(sim, 1) // clear z1
    expect(sim.combatSnapshot().phase).toBe('camp')
    expect(sim.travelTo('z2')).toBe(true)
    expect(sim.progressSnapshot().zoneId).toBe('z2')
  })

  it('killing the final boss completes the campaign', () => {
    const sim = makeSim({
      level: 12,
      content: testContent({ hp: 1 }),
      save: { level: 12, zoneId: 'z2', bossesDefeated: ['z1'] },
    })
    const events = runExpeditions(sim, 1)
    expect(eventsOf(events, 'gameCompleted')).toHaveLength(1)
    expect(sim.progressSnapshot().completed).toBe(true)
    expect(eventsOf(events, 'bossDefeated')).toEqual([
      { kind: 'bossDefeated', zoneId: 'z2', nextZoneId: null },
    ])
  })

  it('dying in an expedition returns you to camp', () => {
    const brutal = testContent({ hp: 1 })
    brutal.enemies['boss1'] = {
      ...brutal.enemies['boss1']!,
      hp: 100_000,
      swingTicks: 10,
      dmgMin: 60,
      dmgMax: 60,
    }
    const sim = makeSim({ content: brutal })
    sim.autoBattle = true
    let died = false
    for (let i = 0; i < 40_000 && !died; i++) {
      for (const e of sim.tick()) if (e.kind === 'playerDied') died = true
    }
    expect(died).toBe(true)
    advance(sim, 120)
    expect(sim.combatSnapshot().phase).toBe('camp')
    expect(sim.zoneUnlocked('z2')).toBe(false) // never felled the boss
  })
})

describe('achievements', () => {
  it('first blood unlocks on the first kill', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    sim.embark()
    const events: CombatEvent[] = []
    for (let i = 0; i < 2000 && eventsOf(events, 'achievementUnlocked').length === 0; i++) {
      const s = sim.combatSnapshot()
      if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
      events.push(...sim.tick())
    }
    expect(eventsOf(events, 'achievementUnlocked').some((a) => a.id === 'first-blood')).toBe(true)
  })
})
