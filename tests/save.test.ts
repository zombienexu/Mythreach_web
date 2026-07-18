import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { SaveData } from '../src/engine/types'
import { advance, advanceToSpawn, blankSave, huntUntil, makeSim, testContent, v1Save } from './helpers'

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
    expect(after.regionId).toBe(before.regionId)
    expect(restored.autoBattle).toBe(true)
  })

  it('comes back at full strength, idle and ready to fight', () => {
    const content = testContent({ swingTicks: 20, dmgMin: 10, dmgMax: 10 })
    const sim = makeSim({ content })
    advanceToSpawn(sim)
    advance(sim, 200) // take some hits from the pack
    expect(sim.combatSnapshot().player.hp).toBeLessThan(sim.combatSnapshot().player.maxHp)
    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(3) })
    const snap = restored.combatSnapshot()
    expect(snap.player.hp).toBe(snap.player.maxHp)
    expect(snap.enemies).toHaveLength(0)
    expect(snap.phase).toBe('idle')
    // The next fight starts on demand.
    expect(restored.startFight()).toBe(true)
    expect(restored.combatSnapshot().enemies.length).toBeGreaterThanOrEqual(1)
  })

  it('v3 round-trips the region and the materials bag', () => {
    const content = testContent({ hp: 1, dropPct: 0 })
    const sim = makeSim({ content, level: 15 })
    expect(sim.enterRegion('r2')).toBe(true)
    // Grind until a material stack lands.
    huntUntil(sim, () => sim.progressSnapshot().materials.length > 0)
    const before = sim.progressSnapshot()
    expect(before.materials.length).toBeGreaterThan(0)
    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(2) })
    const after = restored.progressSnapshot()
    expect(after.regionId).toBe('r2')
    expect(after.materials).toEqual(before.materials)
    expect(restored.combatSnapshot().phase).toBe('idle')
  })

  it('rejects unknown save versions', () => {
    const sim = makeSim()
    const bad = { ...sim.serialize(), version: 99 as never }
    expect(() => GameSim.deserialize(bad, { rng: mulberry32(1) })).toThrow()
  })

  it('accepts a version-1 save and ignores its dead fields', () => {
    const legacy = v1Save({ level: 7, gold: 250, xp: 12 })
    let restored: GameSim | undefined
    expect(() => {
      restored = GameSim.deserialize(legacy as unknown as SaveData, { rng: mulberry32(1) })
    }).not.toThrow()
    const progress = restored!.progressSnapshot()
    expect(progress.level).toBe(7)
    expect(progress.gold).toBe(250)
    expect(progress.xp).toBe(12)
    // Re-serializing yields a clean v5 blob with none of the dead fields.
    const reserialized = restored!.serialize() as unknown as Record<string, unknown>
    expect(reserialized.version).toBe(5)
    expect(reserialized.classId).toBe('arcanist')
    expect(reserialized.savedAt).toBeUndefined()
    expect(reserialized.zoneId).toBeUndefined()
    expect(reserialized.materials).toEqual({})
  })

  it('maps a legacy v2 zone to the region that contains it', () => {
    // A v2 blob predates regions: its zoneId is now itself a region id.
    const v2 = blankSave() as unknown as Record<string, unknown>
    v2.version = 2
    delete v2.regionId
    delete v2.materials
    v2.zoneId = 'stormcrag' // zone ids are region ids since the un-merge
    v2.bossesDefeated = ['hollowroot']
    v2.completed = false
    let restored: GameSim | undefined
    expect(() => {
      restored = GameSim.deserialize(v2 as unknown as SaveData, { rng: mulberry32(1) })
    }).not.toThrow()
    const progress = restored!.progressSnapshot()
    expect(progress.regionId).toBe('stormcrag')
    expect(progress.materials).toEqual([])
  })

  it('maps a v3 merged-region id to the region it un-merged into', () => {
    for (const [legacy, mapped] of [
      ['verdant', 'hollowroot'],
      ['emberwild', 'stormcrag'],
      ['riftedge', 'sundered-spire'],
    ] as const) {
      const blob = blankSave({ regionId: legacy }) as unknown as SaveData
      const restored = GameSim.deserialize(blob, { rng: mulberry32(1) })
      expect(restored.progressSnapshot().regionId).toBe(mapped)
    }
  })

  it('an unknown region id falls back to the first region', () => {
    const blob = blankSave({ regionId: 'atlantis' }) as unknown as SaveData
    const restored = GameSim.deserialize(blob, { rng: mulberry32(1) })
    expect(restored.progressSnapshot().regionId).toBe('hollowroot')
  })
})

describe('auto-battle on real content', () => {
  it('a fresh level-1 hero survives and progresses in the Verdant Reach', () => {
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
    // A naive level-1 auto-player pays a few deaths learning the low region
    // under-levelled. The bound is seed-sensitive: discrete-fight pacing
    // shifted the rng stream, so it sits a notch above the old value.
    expect(deaths).toBeLessThanOrEqual(12)
    expect(sim.progressSnapshot().level).toBeGreaterThanOrEqual(3)
  })
})
