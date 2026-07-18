import { describe, expect, it } from 'vitest'
import { castTicksFor, deriveStats, talentPointsEarned, xpToNext } from '../src/engine/progression'
import type { Item } from '../src/engine/types'
import { DEFAULT_IDENTITY, LEVEL_CAP, RESPEC_COST } from '../src/engine/types'
import { advance, advanceToSpawn, eventsOf, makeSim, testContent } from './helpers'

describe('xp curve', () => {
  it('follows 60 + 40L + 20L²', () => {
    expect(xpToNext(1)).toBe(120)
    expect(xpToNext(2)).toBe(220)
    expect(xpToNext(5)).toBe(760)
    expect(xpToNext(10)).toBe(2460)
    expect(xpToNext(LEVEL_CAP)).toBe(0)
  })
})

describe('leveling', () => {
  it('kills grant XP; enough kills level you up, unlock abilities, and fully restore you', () => {
    // 1 HP dummies worth 60 XP each: two kills reach level 2 (120).
    const sim = makeSim({
      content: testContent({ hp: 1, xp: 60, swingTicks: 30, dmgMin: 8, dmgMax: 8 }),
    })
    sim.autoBattle = true
    const events: ReturnType<typeof advance> = []
    for (let i = 0; i < 3000 && eventsOf(events, 'levelUp').length === 0; i++) {
      events.push(...sim.tick())
    }
    const ups = eventsOf(events, 'levelUp')
    expect(ups.length).toBeGreaterThanOrEqual(1)
    expect(ups[0]!.level).toBe(2)
    expect(ups[0]!.unlocked).toEqual(['renew'])
    const snap = sim.combatSnapshot()
    expect(snap.player.maxHp).toBe(120) // 80 + 20×2
    const progress = sim.progressSnapshot()
    expect(progress.level).toBeGreaterThanOrEqual(2)
    expect(progress.unlockedAbilities).toContain('renew')
  })

  it('XP stops at the cap', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1, xp: 10_000 }) })
    sim.autoBattle = true
    advance(sim, 300)
    const progress = sim.progressSnapshot()
    expect(progress.level).toBe(15)
    expect(progress.xp).toBe(0)
    expect(progress.xpToNext).toBe(0)
  })
})

describe('deriveStats', () => {
  it('computes the documented formulas', () => {
    const gear: Partial<Record<'staff', Item>> = {
      staff: {
        uid: 1,
        name: 'Test Staff',
        slot: 'staff',
        ilvl: 10,
        rarity: 'rare',
        stats: { power: 10, stamina: 4, spirit: 6, crit: 3 },
      },
    }
    const stats = deriveStats(
      DEFAULT_IDENTITY,
      10,
      { fortitude: 2, meditation: 1, impFireball: 3, swiftRenewal: 5, searingFlames: 4, criticalMass: 5 },
      gear,
    )
    expect(stats.power).toBe(37) // 3×9 + 10
    expect(stats.stamina).toBe(4)
    expect(stats.spirit).toBe(6)
    expect(stats.critPct).toBe(18) // 5 + 3 + 10
    expect(stats.maxHp).toBe(336) // (80+200+20) × 1.12
    expect(stats.maxMana).toBe(280)
    expect(stats.regenPerInterval).toBe(13) // floor(floor(24/2) × 1.12)
    expect(castTicksFor(stats, 'fireball')).toBe(38) // 44 − 6
    expect(castTicksFor(stats, 'renew')).toBe(16) // 36 − 20
    expect(stats.schoolBonusPct.fire).toBe(32)
    expect(stats.healMultPct).toBe(152) // 100 + 12 + 40
  })

  it('level 1 with nothing equipped matches the starting hero', () => {
    const stats = deriveStats(DEFAULT_IDENTITY, 1, {}, {})
    expect(stats.maxHp).toBe(100)
    expect(stats.maxMana).toBe(100)
    expect(stats.power).toBe(0)
    expect(stats.critPct).toBe(5)
    expect(castTicksFor(stats, 'fireball')).toBe(44)
    expect(stats.gcdTicks).toBe(24)
    expect(stats.xpMultPct).toBe(100)
    expect(stats.cheatDeath).toBe(false)
  })

  it('origins and signs lean on the stat block', () => {
    const scholar = deriveStats(
      { classId: 'arcanist', originId: 'lamplit-scholar', signId: 'moth' },
      1,
      {},
      {},
    )
    expect(scholar.xpMultPct).toBe(110)
    expect(scholar.critPct).toBe(8) // 5 + the Moth's 3

    const survivor = deriveStats(
      { classId: 'arcanist', originId: 'ashmarch-survivor', signId: 'tower' },
      1,
      {},
      {},
    )
    expect(survivor.maxHp).toBe(108) // 100 × 1.08
    expect(survivor.cheatDeath).toBe(true)

    const courier = deriveStats(
      { classId: 'arcanist', originId: 'guild-courier', signId: 'serpent' },
      1,
      {},
      {},
    )
    expect(courier.goldMultPct).toBe(112)
    expect(courier.respawnCutPct).toBe(40)

    const ward = deriveStats(
      { classId: 'arcanist', originId: 'hedgewitch-ward', signId: 'lantern' },
      5,
      {},
      {},
    )
    expect(ward.regenPerInterval).toBe(Math.floor((6 * 115) / 100))
    expect(ward.dropBonusPct).toBe(6)
    expect(ward.materialBonusPct).toBe(10)
  })
})

describe('talents', () => {
  it('earns one point per level past 1 and spends them up to max rank', () => {
    expect(talentPointsEarned(1)).toBe(0)
    expect(talentPointsEarned(5)).toBe(4)
    const sim = makeSim({ level: 7 })
    expect(sim.progressSnapshot().talentPoints).toBe(6)
    for (let i = 0; i < 5; i++) expect(sim.spendTalent('criticalMass')).toBe(true)
    expect(sim.spendTalent('criticalMass')).toBe(false) // max rank
    expect(sim.spendTalent('fortitude')).toBe(true)
    expect(sim.spendTalent('meditation')).toBe(false) // out of points
    const snap = sim.progressSnapshot()
    expect(snap.talentPoints).toBe(0)
    expect(snap.talentRanks.criticalMass).toBe(5)
    expect(snap.stats.critPct).toBe(15)
  })

  it('respec refunds everything for a flat gold cost', () => {
    const sim = makeSim({ level: 5, save: { gold: 100 } })
    sim.spendTalent('fortitude')
    sim.spendTalent('fortitude')
    expect(sim.respec()).toBe(true)
    const snap = sim.progressSnapshot()
    expect(snap.gold).toBe(100 - RESPEC_COST)
    expect(snap.talentPoints).toBe(4)
    expect(snap.talentRanks.fortitude).toBe(0)
  })

  it('respec is refused without ranks or without gold', () => {
    const rich = makeSim({ level: 5, save: { gold: 100 } })
    expect(rich.respec()).toBe(false) // nothing spent
    const poor = makeSim({ level: 5, save: { gold: 10 } })
    poor.spendTalent('fortitude')
    expect(poor.respec()).toBe(false)
  })

  it('talent effects reach combat: Improved Fireball shortens the cast', () => {
    const sim = makeSim({ level: 6 })
    for (let i = 0; i < 5; i++) sim.spendTalent('impFireball')
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    expect(sim.combatSnapshot().cast?.totalTicks).toBe(34)
  })
})
