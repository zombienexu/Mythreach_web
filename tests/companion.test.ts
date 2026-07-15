import { describe, expect, it } from 'vitest'
import { COMPANIONS } from '../src/engine/content/companions'
import type { CombatEvent } from '../src/engine/events'
import { GameSim } from '../src/engine/sim'
import { mulberry32 } from '../src/engine/rng'
import { advance, advanceToSpawn, eventsOf, makeSim, testContent } from './helpers'

const WREN = COMPANIONS.wren!

describe('companion — the hireling', () => {
  it('hiring costs gold, persists, and survives a save round-trip', () => {
    const content = testContent()
    const sim = makeSim({ content, save: { gold: 200 } })
    expect(sim.hireCompanion()).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(200 - WREN.cost)
    expect(sim.progressSnapshot().companion).toEqual({ id: 'wren', name: WREN.name })
    // A second hire is refused.
    expect(sim.hireCompanion()).toBe(false)

    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(2) })
    expect(restored.progressSnapshot().companion).toEqual({ id: 'wren', name: WREN.name })
  })

  it('the companion swings at the player target on its own clock', () => {
    const sim = makeSim({ level: 5, content: testContent({ hp: 5000 }), save: { gold: 200, level: 5 } })
    expect(sim.hireCompanion()).toBe(true)
    advanceToSpawn(sim) // reach the first pack
    const events = advance(sim, WREN.swingTicks + 2)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'companion')
    expect(hits.length).toBeGreaterThanOrEqual(1)
    const d = WREN.baseDmg + WREN.dmgPerLevel * 5 // 8
    for (const h of hits) {
      expect(h.amount).toBeGreaterThanOrEqual(Math.max(1, d - 2))
      expect(h.amount).toBeLessThanOrEqual(d + 2)
    }
  })

  it('the companion is idle between fights, with no target', () => {
    const sim = makeSim({ level: 5, content: testContent({ hp: 5000 }), save: { gold: 200, level: 5 } })
    sim.hireCompanion()
    // No fight has been started: the field is empty, so no swings.
    const idle = advance(sim, 10)
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    expect(eventsOf(idle, 'damage').filter((e) => e.source === 'companion')).toHaveLength(0)
  })

  it('companion damage can finish a kill and rewards flow normally', () => {
    const sim = makeSim({
      level: 5,
      content: testContent({ hp: 6, xp: 10, goldMin: 3, goldMax: 3 }),
      save: { gold: 200, level: 5 },
    })
    sim.hireCompanion()
    advanceToSpawn(sim)
    // Do not cast — let the blade do the work.
    const events: CombatEvent[] = []
    for (let i = 0; i < 200 && eventsOf(events, 'enemyDied').length === 0; i++) {
      events.push(...sim.tick())
    }
    const kill = eventsOf(events, 'enemyDied')
    expect(kill).toHaveLength(1)
    // The killing blow was the companion's, and the reward pipeline ran:
    // xp on the spot, gold banked on the corpse until the loot screen pays it.
    expect(eventsOf(events, 'damage').some((e) => e.source === 'companion')).toBe(true)
    expect(eventsOf(events, 'xpGained').length).toBeGreaterThanOrEqual(1)
    expect(sim.collectAllLoot()).toBe(true)
    expect(eventsOf(sim.tick(), 'goldGained').length).toBeGreaterThanOrEqual(1)
  })
})
