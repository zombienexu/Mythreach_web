import { describe, expect, it } from 'vitest'
import { advance, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** Resolve a Fireball (GCD + 44-tick cast) and return the events. */
function fireball(sim: ReturnType<typeof makeSim>) {
  sim.useAbility('fireball')
  return advance(sim, 50)
}

describe('fireball — the workhorse of the fire', () => {
  it('lays one Smolder and banks one Heat', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    fireball(sim)
    expect(sim.combatSnapshot().player.heat).toBe(1)
    expect(targetOf(sim)?.smolder?.stacks).toBe(1)
  })

  it('still deals its base fire hit on resolution', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    const ev = fireball(sim)
    const hit = eventsOf(ev, 'damage').find((e) => e.source === 'fireball')
    expect(hit).toBeDefined()
    expect(hit!.target).toBe('enemy')
  })

  it('stacks Smolder up to five, and no further', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    for (let i = 0; i < 7; i++) fireball(sim)
    expect(targetOf(sim)?.smolder?.stacks).toBe(5)
  })
})

describe('heat evolves the fireball', () => {
  /** A two-mob pack, both harmless, so splash/pierce is observable. */
  const pack = () =>
    testContent(
      { hp: 4000, swingTicks: 10_000 },
      { region1Encounters: [{ slots: [{ enemyId: 'dummy' }, { enemyId: 'dummy' }], weight: 1 }] },
    )

  it('below 5 Heat, Fireball is single-target (no splash)', () => {
    const sim = makeSim({ level: 6, content: pack() })
    advanceToSpawn(sim)
    const target = sim.combatSnapshot().target
    const ev = fireball(sim)
    const otherHit = eventsOf(ev, 'damage').some((e) => e.source === 'fireball' && e.iid !== target)
    expect(otherHit).toBe(false)
  })

  it('at 5+ Heat, Fireball splashes a second foe', () => {
    const sim = makeSim({ level: 6, content: pack() })
    advanceToSpawn(sim)
    // Climb to Empowered: five Fireballs bank five Heat.
    for (let i = 0; i < 5; i++) fireball(sim)
    expect(sim.combatSnapshot().player.heat).toBeGreaterThanOrEqual(5)
    const target = sim.combatSnapshot().target
    const ev = fireball(sim)
    const splashed = eventsOf(ev, 'damage').some((e) => e.source === 'fireball' && e.iid !== target)
    expect(splashed).toBe(true)
  })

  it('Heat caps at 10 and never overflows', () => {
    const sim = makeSim({ content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    for (let i = 0; i < 14; i++) fireball(sim)
    expect(sim.combatSnapshot().player.heat).toBe(10)
  })
})

describe('detonate — cash in the smolder', () => {
  it('consumes every Smolder stack', () => {
    const sim = makeSim({ level: 5 })
    advanceToSpawn(sim)
    fireball(sim)
    fireball(sim)
    expect(targetOf(sim)?.smolder?.stacks).toBe(2)
    sim.useAbility('detonate')
    const ev = advance(sim, 3)
    expect(eventsOf(ev, 'smolderDetonated')).toHaveLength(1)
    expect(targetOf(sim)?.smolder).toBeNull()
  })

  it('is refused with no Smolder to spend', () => {
    const sim = makeSim({ level: 5 })
    advanceToSpawn(sim)
    expect(sim.canUse('detonate')).toBe(false)
  })

  it('a Volatile field detonates far harder than a Fresh one', () => {
    const detonateDamage = (waitTicks: number): number => {
      const sim = makeSim({ level: 5, seed: 7, content: testContent({ hp: 100_000 }) })
      advanceToSpawn(sim)
      fireball(sim) // one stack
      advance(sim, waitTicks) // let it age
      sim.useAbility('detonate')
      const ev = advance(sim, 3)
      return eventsOf(ev, 'damage').find((e) => e.source === 'detonate')?.amount ?? 0
    }
    const fresh = detonateDamage(2) // still Fresh
    const volatile = detonateDamage(110) // aged past 5 s → Volatile
    expect(volatile).toBeGreaterThan(fresh)
  })

  it('banks Heat on use', () => {
    const sim = makeSim({ level: 5, content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    fireball(sim) // +1 heat, 1 stack
    const before = sim.combatSnapshot().player.heat
    sim.useAbility('detonate')
    advance(sim, 3)
    expect(sim.combatSnapshot().player.heat).toBeGreaterThan(before)
  })
})

describe('kindle — instant smolder', () => {
  it('lays one Smolder instantly', () => {
    const sim = makeSim({ level: 5 })
    advanceToSpawn(sim)
    sim.useAbility('kindle')
    advance(sim, 2)
    expect(targetOf(sim)?.smolder?.stacks).toBe(1)
  })
})

describe('wildfire — spread the blaze', () => {
  const pack = () =>
    testContent(
      { hp: 100_000, swingTicks: 10_000 },
      { region1Encounters: [{ slots: [{ enemyId: 'dummy' }, { enemyId: 'dummy' }], weight: 1 }] },
    )

  it('seeds Smolder on the whole pack', () => {
    const sim = makeSim({ level: 7, content: pack() })
    advanceToSpawn(sim)
    sim.useAbility('wildfire')
    advance(sim, 2)
    const seeded = sim.combatSnapshot().enemies.filter((e) => (e.smolder?.stacks ?? 0) > 0)
    expect(seeded.length).toBe(2)
  })

  it('leaps living fire to other foes when Smolder is consumed', () => {
    const sim = makeSim({ level: 7, content: pack() })
    advanceToSpawn(sim)
    const target = sim.combatSnapshot().target!
    // Build the target's field, leave the other foe cold.
    sim.useAbility('kindle')
    advance(sim, 30)
    sim.useAbility('kindle')
    advance(sim, 30)
    const otherBefore = sim.combatSnapshot().enemies.find((e) => e.iid !== target)
    sim.setTarget(target)
    sim.useAbility('detonate')
    const ev = advance(sim, 3)
    // The detonation spread Smolder onto the other foe.
    expect(eventsOf(ev, 'smolderApplied').some((e) => e.spread && e.iid !== target)).toBe(true)
    const otherAfter = sim.combatSnapshot().enemies.find((e) => e.iid !== target)
    expect(otherAfter?.smolder?.stacks ?? 0).toBeGreaterThan(otherBefore?.smolder?.stacks ?? 0)
  })
})
