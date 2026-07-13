import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import { MS_PER_TICK, OFFLINE_CAP_TICKS } from '../src/engine/types'
import { advance, makeSim, testContent } from './helpers'

describe('serialize / deserialize', () => {
  it('round-trips progression exactly', () => {
    const content = testContent({ hp: 1, xp: 30, dropPct: 50 })
    const sim = makeSim({ content })
    sim.autoBattle = true
    advance(sim, 3000)
    const before = sim.progressSnapshot()
    const save = sim.serialize()
    const restored = GameSim.deserialize(JSON.parse(JSON.stringify(save)), {
      content,
      rng: mulberry32(2),
    })
    const after = restored.progressSnapshot()
    expect(after.level).toBe(before.level)
    expect(after.xp).toBe(before.xp)
    expect(after.gold).toBe(before.gold)
    expect(after.inventory).toEqual(before.inventory)
    expect(after.equipped).toEqual(before.equipped)
    expect(after.achievements.sort()).toEqual(before.achievements.sort())
    expect(after.lifetime).toEqual(before.lifetime)
    expect(after.zoneId).toBe(before.zoneId)
    expect(restored.autoBattle).toBe(true)
  })

  it('comes back at full strength with a fresh spawn pending', () => {
    const content = testContent({ swingTicks: 20, dmgMin: 10, dmgMax: 10 })
    const sim = makeSim({ content })
    advance(sim, 200) // take some hits
    expect(sim.combatSnapshot().player.hp).toBeLessThan(sim.combatSnapshot().player.maxHp)
    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(3) })
    const snap = restored.combatSnapshot()
    expect(snap.player.hp).toBe(snap.player.maxHp)
    expect(snap.enemy).toBeNull()
  })

  it('rejects unknown save versions', () => {
    const sim = makeSim()
    const bad = { ...sim.serialize(), version: 99 as never }
    expect(() => GameSim.deserialize(bad)).toThrow()
  })
})

describe('offline progress', () => {
  it('offlineTicks floors and caps', () => {
    expect(GameSim.offlineTicks(0)).toBe(0)
    expect(GameSim.offlineTicks(MS_PER_TICK * 100)).toBe(100)
    expect(GameSim.offlineTicks(1000 * 60 * 60 * 24)).toBe(OFFLINE_CAP_TICKS)
  })

  it('fastForward grinds on auto and reports the haul', () => {
    const sim = makeSim({ content: testContent({ hp: 1, xp: 30, dropPct: 30 }) })
    expect(sim.autoBattle).toBe(false)
    const summary = sim.fastForward(12_000) // 10 minutes
    expect(summary.kills).toBeGreaterThan(20)
    expect(summary.xpGained).toBeGreaterThan(600)
    expect(summary.goldGained).toBeGreaterThan(0)
    expect(summary.levelTo).toBeGreaterThan(summary.levelFrom)
    expect(sim.autoBattle).toBe(false) // restored
    // The haul is real: it's in the progression too.
    const progress = sim.progressSnapshot()
    expect(progress.level).toBe(summary.levelTo)
    expect(progress.lifetime.kills).toBe(summary.kills)
  })

  it('itemsKept are sorted best-first', () => {
    const sim = makeSim({ content: testContent({ hp: 1, dropPct: 100 }), seed: 8 })
    const summary = sim.fastForward(8_000)
    const order = { common: 0, uncommon: 1, rare: 2, epic: 3 }
    for (let i = 1; i < summary.itemsKept.length; i++) {
      expect(order[summary.itemsKept[i - 1]!.rarity]).toBeGreaterThanOrEqual(
        order[summary.itemsKept[i]!.rarity],
      )
    }
  })
})

describe('auto-battle on real content', () => {
  it('a fresh level-1 hero survives and progresses in Hollowroot Cavern', () => {
    const sim = new GameSim({ rng: mulberry32(42) })
    sim.autoBattle = true
    let kills = 0
    let deaths = 0
    for (let i = 0; i < 24_000; i++) {
      // 20 minutes
      for (const e of sim.tick()) {
        if (e.kind === 'enemyDied') kills++
        if (e.kind === 'playerDied') deaths++
      }
    }
    expect(kills).toBeGreaterThanOrEqual(15)
    expect(deaths).toBeLessThanOrEqual(2)
    expect(sim.progressSnapshot().level).toBeGreaterThanOrEqual(3)
  })
})
