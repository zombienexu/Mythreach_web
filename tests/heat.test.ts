import { describe, expect, it } from 'vitest'
import { advance, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** A foe that winds up on a readable clock (and hits for nothing, so the hero
 *  survives to keep testing). */
const teller = () => testContent({ hp: 100_000, swingTicks: 40, dmgMin: 0, dmgMax: 0 })

describe('openings — reading the foe with Focus', () => {
  it('a foe deep in its wind-up shows a tell', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    advance(sim, 26) // past 60% of a 40-tick wind-up
    expect(targetOf(sim)?.combatState).toBe('telegraph')
  })

  it('Focus answers a tell and Exposes the foe', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    advance(sim, 26)
    expect(sim.focus()).toBe(true)
    const ev = advance(sim, 1)
    expect(eventsOf(ev, 'openingCreated')).toBeDefined()
    const t = targetOf(sim)
    expect(t?.combatState).toBe('exposed')
    expect(t?.openingTicks).toBeGreaterThan(0)
  })

  it('Focus whiffs (short lockout) when no tell is open', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    advance(sim, 3) // barely into the wind-up — nothing to read
    expect(sim.focus()).toBe(true)
    expect(eventsOf(advance(sim, 1), 'focusUsed')).toBeDefined()
    expect(targetOf(sim)?.combatState).not.toBe('exposed')
    // The lockout is shorter than a successful read's cooldown.
    expect(sim.combatSnapshot().player.focusCd).toBeLessThan(50)
  })

  it('an Exposed foe takes more from your fire', () => {
    const hit = (expose: boolean): number => {
      const sim = makeSim({ level: 5, seed: 3, content: teller() })
      advanceToSpawn(sim)
      if (expose) {
        advance(sim, 26)
        sim.focus()
      }
      sim.useAbility('kindle') // instant; the Opening outlasts the GCD
      advance(sim, 25) // let the GCD clear before detonating
      sim.useAbility('detonate')
      return eventsOf(advance(sim, 3), 'damage').find((e) => e.source === 'detonate')?.amount ?? 0
    }
    expect(hit(true)).toBeGreaterThan(hit(false))
  })

  it('Kindle into an Opening lays two Smolder instead of one', () => {
    const sim = makeSim({ level: 5, content: teller() })
    advanceToSpawn(sim)
    advance(sim, 26)
    sim.focus()
    sim.useAbility('kindle')
    advance(sim, 2)
    expect(targetOf(sim)?.smolder?.stacks).toBe(2)
  })
})

describe('smolder ages and falls off', () => {
  it('a lone stack burns out after its duration', () => {
    const sim = makeSim({ content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    advance(sim, 50)
    expect(targetOf(sim)?.smolder?.stacks).toBe(1)
    advance(sim, 230) // past the 11 s stack duration
    expect(targetOf(sim)?.smolder).toBeNull()
  })

  it('untrained Smolder is inert pressure — no free burn ticks', () => {
    const sim = makeSim({ content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    advance(sim, 50)
    const ev = advance(sim, 45)
    expect(eventsOf(ev, 'damage').some((e) => e.source === 'smolder')).toBe(false)
  })

  it('Lingering Flame ranks light the burn, fiercer per rank', () => {
    const burnOver = (rank: number): number => {
      const sim = makeSim({
        content: testContent({ hp: 100_000 }),
        save: { talents: rank > 0 ? { lingeringFlame: rank } : {} },
      })
      advanceToSpawn(sim)
      sim.useAbility('fireball')
      advance(sim, 50)
      return eventsOf(advance(sim, 45), 'damage')
        .filter((e) => e.source === 'smolder')
        .reduce((s, e) => s + e.amount, 0)
    }
    expect(burnOver(1)).toBeGreaterThan(0)
    expect(burnOver(3)).toBeGreaterThan(burnOver(1))
  })
})

describe('the spenders — flashpoint and inferno', () => {
  it('Flashpoint spends all Heat to force an Opening', () => {
    const sim = makeSim({ level: 9, content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    sim.useAbility('fireball') // bank a little heat
    advance(sim, 50)
    expect(sim.combatSnapshot().player.heat).toBeGreaterThan(0)
    sim.useAbility('flashpoint')
    advance(sim, 2)
    expect(sim.combatSnapshot().player.heat).toBe(0)
    expect(targetOf(sim)?.combatState).toBe('exposed')
  })

  it('Inferno spends Heat and Smolder in one bloom', () => {
    const sim = makeSim({ level: 11, content: testContent({ hp: 100_000 }) })
    advanceToSpawn(sim)
    for (let i = 0; i < 3; i++) {
      sim.useAbility('fireball')
      advance(sim, 50)
    }
    expect(sim.combatSnapshot().player.heat).toBeGreaterThan(0)
    expect(targetOf(sim)?.smolder?.stacks).toBeGreaterThan(0)
    sim.useAbility('inferno')
    const ev = advance(sim, 3)
    expect(eventsOf(ev, 'damage').some((e) => e.source === 'inferno')).toBe(true)
    expect(sim.combatSnapshot().player.heat).toBe(0)
    expect(targetOf(sim)?.smolder).toBeNull()
  })
})

describe('only the Arcanist runs on fire', () => {
  it('other callings never gain Heat', () => {
    const grave = makeSim({ level: 5, identity: { classId: 'gravewright', originId: '', signId: '' } })
    advanceToSpawn(grave)
    grave.useAbility('gravebolt')
    advance(grave, 50)
    expect(grave.combatSnapshot().player.heat).toBe(0)
  })
})
