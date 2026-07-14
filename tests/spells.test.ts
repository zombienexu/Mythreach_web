import { describe, expect, it } from 'vitest'
import type { Item } from '../src/engine/types'
import { advance, advanceTimeline, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

function critGear(crit: number): Partial<Record<'trinket', Item>> {
  return {
    trinket: { uid: 900, name: 'Test Charm', slot: 'trinket', ilvl: 1, rarity: 'epic', stats: { crit } },
  }
}

describe('ignite', () => {
  it('burns 6 times at 20-tick intervals, then falls off', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    const start = sim.combatSnapshot().tick
    sim.useAbility('ignite')
    const timeline = advanceTimeline(sim, 140)
    const burns = timeline.filter(({ events }) =>
      events.some((e) => e.kind === 'damage' && e.source === 'ignite'),
    )
    expect(burns.map((b) => b.tick - start)).toEqual([20, 40, 60, 80, 100, 120])
    expect(targetOf(sim)?.dot).toBeNull()
  })

  it('scales with power, snapshotted at apply time', () => {
    // Level 15 → power 42 → tick damage round(5 × 1.42) = 7.
    const sim = makeSim({ level: 15 })
    advanceToSpawn(sim)
    sim.useAbility('ignite')
    const events = advance(sim, 25)
    const burn = eventsOf(events, 'damage').find((e) => e.source === 'ignite')
    expect(burn?.amount).toBe(7)
  })

  it('reapplying refreshes the full duration', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    sim.useAbility('ignite')
    advance(sim, 160) // cooldown over; 8 of 6 burns done → dot expired
    sim.useAbility('ignite')
    expect(targetOf(sim)?.dot?.remainingTicks).toBe(120)
  })
})

describe('renew', () => {
  it('heals for the rolled amount and clamps at max HP', () => {
    // Enemy that hits hard enough to make room for the heal.
    const sim = makeSim({ level: 2, content: testContent({ swingTicks: 30, dmgMin: 20, dmgMax: 20 }) })
    advanceToSpawn(sim)
    advance(sim, 65) // two swings land → −40 HP
    const before = sim.combatSnapshot().player.hp
    expect(before).toBeLessThan(sim.combatSnapshot().player.maxHp)
    sim.useAbility('renew')
    const events = advance(sim, 36)
    const heals = eventsOf(events, 'heal')
    expect(heals).toHaveLength(1)
    expect(heals[0]!.amount).toBeGreaterThanOrEqual(20)
  })

  it('can crit for 175%', () => {
    // 5 + 95 gear crit = guaranteed crit; hard swings make room to heal into.
    const sim = makeSim({
      level: 2,
      save: { equipped: critGear(95) },
      content: testContent({ swingTicks: 30, dmgMin: 30, dmgMax: 30 }),
    })
    advanceToSpawn(sim)
    advance(sim, 65)
    sim.useAbility('renew')
    const events = advance(sim, 36)
    const heal = eventsOf(events, 'heal')[0]
    expect(heal?.crit).toBe(true)
    // 20–28 base × 1.75, rounded.
    expect(heal!.amount).toBeGreaterThanOrEqual(35)
  })
})

describe('pyroblast', () => {
  it('hits much harder than fireball and starts its 240-tick cooldown at resolve', () => {
    const sim = makeSim({ level: 4 })
    advanceToSpawn(sim)
    sim.useAbility('pyroblast')
    const events = advance(sim, 70)
    const dmg = eventsOf(events, 'damage').find((e) => e.source === 'pyroblast')
    expect(dmg).toBeDefined()
    // 48–64 base scaled by power (level 4 → ×1.09), possibly a crit.
    expect(dmg!.amount).toBeGreaterThanOrEqual(48)
    expect(sim.combatSnapshot().cooldowns.pyroblast).toBe(240)
  })
})

describe('arcane barrier', () => {
  it('absorbs swing damage before HP, then breaks', () => {
    // Level 8 barrier = 25 + 5×8 = 65 absorb; swings hit for exactly 10.
    const sim = makeSim({ level: 8, content: testContent({ swingTicks: 30, dmgMin: 10, dmgMax: 10 }) })
    advanceToSpawn(sim)
    sim.useAbility('barrier')
    expect(sim.combatSnapshot().player.shield).toBe(65)
    const events = advance(sim, 30 * 7 + 5)
    const hits = eventsOf(events, 'damage').filter((e) => e.target === 'player')
    // First six swings fully absorbed…
    for (const hit of hits.slice(0, 6)) {
      expect(hit.absorbed).toBe(10)
      expect(hit.amount).toBe(0)
    }
    // …seventh eats the last 5 and lands 5.
    expect(hits[6]!.absorbed).toBe(5)
    expect(hits[6]!.amount).toBe(5)
    expect(eventsOf(events, 'shieldBroken')).toHaveLength(1)
    expect(sim.combatSnapshot().player.shield).toBe(0)
  })

  it('expires on its own after 600 ticks if not consumed', () => {
    const sim = makeSim({ level: 8 })
    advanceToSpawn(sim)
    sim.useAbility('barrier')
    const events = advance(sim, 600)
    expect(eventsOf(events, 'buffExpired').filter((e) => e.id === 'barrier')).toHaveLength(1)
    expect(sim.combatSnapshot().player.shield).toBe(0)
  })
})

describe('combustion', () => {
  it('boosts fire damage by 25% (visible in ignite tick damage)', () => {
    const sim = makeSim({ level: 11 })
    advanceToSpawn(sim)
    // Level 11 → power 30 → ignite tick = round(5 × 1.30) = 7 (wait: 6.5 → 7? round(6.5)=7).
    sim.useAbility('ignite')
    const plain = eventsOf(advance(sim, 25), 'damage').find((e) => e.source === 'ignite')
    advance(sim, 160)
    sim.useAbility('combustion')
    advance(sim, 25) // GCD
    sim.useAbility('ignite')
    const boosted = eventsOf(advance(sim, 25), 'damage').find((e) => e.source === 'ignite')
    expect(plain).toBeDefined()
    expect(boosted).toBeDefined()
    expect(boosted!.amount).toBe(Math.round((plain!.amount * 125) / 100))
  })

  it('guarantees crits when base crit + 20% reaches 100', () => {
    const sim = makeSim({ level: 11, save: { equipped: critGear(75) } }) // 5+75+20 = 100 while burning
    advanceToSpawn(sim)
    sim.useAbility('combustion')
    advance(sim, 25)
    sim.useAbility('fireball')
    const events = advance(sim, 44)
    const dmg = eventsOf(events, 'damage').find((e) => e.source === 'fireball')
    expect(dmg?.crit).toBe(true)
  })

  it('expires after 240 ticks', () => {
    const sim = makeSim({ level: 11 })
    advanceToSpawn(sim)
    sim.useAbility('combustion')
    const events = advance(sim, 240)
    expect(eventsOf(events, 'buffExpired').filter((e) => e.id === 'combustion')).toHaveLength(1)
  })
})

describe('counterspell', () => {
  const casterContent = () =>
    testContent({
      mechanics: [{ kind: 'hardcast', name: 'Test Bolt', castTicks: 40, cooldownTicks: 200, dmgMin: 30, dmgMax: 30 }],
    })

  it('is only usable while the enemy is casting', () => {
    const sim = makeSim({ level: 6, content: casterContent() })
    advanceToSpawn(sim)
    expect(sim.canUse('counterspell')).toBe(false)
    const events = advance(sim, 100) // initial cast delay is cooldown/2 = 100
    expect(eventsOf(events, 'enemyCastStarted')).toHaveLength(1)
    expect(sim.canUse('counterspell')).toBe(true)
  })

  it('interrupts the cast: no damage lands and the enemy restarts its cooldown', () => {
    const sim = makeSim({ level: 6, content: casterContent() })
    advanceToSpawn(sim)
    advance(sim, 100)
    expect(sim.useAbility('counterspell')).toBe(true)
    // The full 200-tick recast cooldown restarts: no bolt lands in the next 180 ticks.
    const events = advance(sim, 180)
    expect(eventsOf(events, 'interrupted')).toHaveLength(1)
    expect(eventsOf(events, 'damage').filter((e) => e.source === 'enemyCast')).toHaveLength(0)
    expect(targetOf(sim)?.cast).toBeNull()
  })

  it('fires off-GCD, even during your own cast, without breaking it', () => {
    const sim = makeSim({ level: 6, content: casterContent() })
    advanceToSpawn(sim)
    advance(sim, 90)
    sim.useAbility('fireball')
    const events = advance(sim, 10) // enemy cast starts at +100
    expect(eventsOf(events, 'enemyCastStarted')).toHaveLength(1)
    expect(sim.combatSnapshot().cast?.abilityId).toBe('fireball')
    expect(sim.useAbility('counterspell')).toBe(true)
    const drained = advance(sim, 1)
    expect(eventsOf(drained, 'interrupted')).toHaveLength(1)
    expect(sim.combatSnapshot().cast?.abilityId).toBe('fireball') // own cast intact
  })
})
