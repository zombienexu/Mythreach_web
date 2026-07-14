import { describe, expect, it } from 'vitest'
import { WORLD_BOSS_MAX_HP } from '../src/engine/content/worldboss'
import type { CombatEvent } from '../src/engine/events'
import { advance, eventsOf, makeSim } from './helpers'

describe('world boss — the Rift Colossus', () => {
  it('assault spawns the colossus at its pooled hp and retreat banks the damage', () => {
    const sim = makeSim({ level: 12 })
    expect(sim.assaultWorldBoss()).toBe(true)
    expect(sim.combatSnapshot().phase).toBe('assault')
    const colossus = sim.combatSnapshot().enemies[0]!
    expect(colossus.rank).toBe('boss')
    expect(colossus.hp).toBe(WORLD_BOSS_MAX_HP)

    sim.useAbility('fireball')
    advance(sim, 50) // land it
    expect(sim.retreat()).toBe(true)
    const ended = eventsOf(sim.tick(), 'worldBossAssaultEnded')[0]
    expect(ended).toBeDefined()
    expect(ended!.damageDealt).toBeGreaterThan(0)

    const wb = sim.progressSnapshot().worldBoss
    expect(wb.hp).toBe(wb.maxHp - ended!.damageDealt)

    // A second assault spawns at the reduced pool.
    expect(sim.assaultWorldBoss()).toBe(true)
    expect(sim.combatSnapshot().enemies[0]!.hp).toBe(wb.hp)
  })

  it('death during an assault also banks the damage', () => {
    const sim = makeSim({ level: 1 })
    sim.assaultWorldBoss()
    sim.autoBattle = true // auto never *starts* an assault, but fights the one we started
    const events: CombatEvent[] = []
    for (let i = 0; i < 6000; i++) {
      events.push(...sim.tick())
      if (events.some((e) => e.kind === 'playerDied')) break
    }
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    const ended = eventsOf(events, 'worldBossAssaultEnded')[0]
    expect(ended).toBeDefined()
    expect(ended!.damageDealt).toBeGreaterThan(0)
    const wb = sim.progressSnapshot().worldBoss
    expect(wb.hp).toBe(wb.maxHp - ended!.damageDealt)
  })

  it('felling it pays 500 gold, an epic, the achievement, and resets the pool', () => {
    const sim = makeSim({ level: 12, save: { worldBossHp: 10 } })
    const goldBefore = sim.progressSnapshot().gold
    sim.assaultWorldBoss()
    const events: CombatEvent[] = []
    for (let i = 0; i < 4000; i++) {
      const s = sim.combatSnapshot()
      if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
      events.push(...sim.tick())
      if (events.some((e) => e.kind === 'worldBossFelled')) break
    }
    expect(eventsOf(events, 'worldBossFelled')).toHaveLength(1)
    const prog = sim.progressSnapshot()
    expect(prog.gold).toBe(goldBefore + 500)
    expect(prog.inventory.some((i) => i.rarity === 'epic')).toBe(true)
    expect(prog.achievements).toContain('worldboss-felled')
    expect(prog.records.worldBossFells).toBe(1)
    expect(prog.worldBoss.hp).toBe(WORLD_BOSS_MAX_HP) // pool reset
  })

  it('assault is refused mid-expedition', () => {
    const sim = makeSim({ level: 12 })
    sim.embark()
    expect(sim.assaultWorldBoss()).toBe(false)
  })
})
