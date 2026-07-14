import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { SaveData } from '../src/engine/types'
import { advance, makeSim, testContent, v1Save } from './helpers'

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

  it('comes back at full strength, at camp', () => {
    const content = testContent({ swingTicks: 20, dmgMin: 10, dmgMax: 10 })
    const sim = makeSim({ content })
    sim.embark()
    advance(sim, 200) // walk to the fight and take some hits
    expect(sim.combatSnapshot().player.hp).toBeLessThan(sim.combatSnapshot().player.maxHp)
    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(3) })
    const snap = restored.combatSnapshot()
    expect(snap.player.hp).toBe(snap.player.maxHp)
    expect(snap.enemies).toHaveLength(0)
    expect(snap.phase).toBe('camp')
  })

  it('rejects unknown save versions', () => {
    const sim = makeSim()
    const bad = { ...sim.serialize(), version: 99 as never }
    expect(() => GameSim.deserialize(bad, { rng: mulberry32(1) })).toThrow()
  })

  it('accepts a version-1 save and ignores its dead fields', () => {
    // A v1 blob still carries savedAt, muted and zoneKills. Deserialize must
    // round-trip the live progression and simply drop the rest.
    const legacy = v1Save({ level: 7, gold: 250, xp: 12 })
    let restored: GameSim | undefined
    expect(() => {
      restored = GameSim.deserialize(legacy as unknown as SaveData, { rng: mulberry32(1) })
    }).not.toThrow()
    const progress = restored!.progressSnapshot()
    expect(progress.level).toBe(7)
    expect(progress.gold).toBe(250)
    expect(progress.xp).toBe(12)
    // Re-serializing yields a clean v2 blob with none of the dead fields.
    const reserialized = restored!.serialize() as unknown as Record<string, unknown>
    expect(reserialized.version).toBe(2)
    expect(reserialized.savedAt).toBeUndefined()
    expect(reserialized.muted).toBeUndefined()
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
    // Auto-battle now walks to the zone boss at the end of every expedition, so a
    // level-1 hero pays a few deaths learning it under-levelled (a real player
    // would out-level first — see the balance envelope). It still progresses.
    expect(deaths).toBeLessThanOrEqual(6)
    expect(sim.progressSnapshot().level).toBeGreaterThanOrEqual(3)
  })
})
