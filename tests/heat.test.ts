import { describe, expect, it } from 'vitest'
import { STOKE_CD_TICKS, STOKE_WINDOW_TICKS } from '../src/engine/abilities'
import { advance, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** A foe that winds up on a readable clock (and hits for nothing, so the hero
 *  survives to keep testing). */
const teller = () => testContent({ hp: 100_000, swingTicks: 40, dmgMin: 0, dmgMax: 0 })

describe('stoke — the half second of open flue', () => {
  it('a working landed inside the window banks two Heat, not one', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    // Fireball's cast is 44 ticks after the GCD — open the flue late, so the
    // fire *lands* inside it rather than leaving before it opens.
    advance(sim, 40)
    expect(sim.stoke()).toBe(true)
    advance(sim, 10)
    expect(sim.combatSnapshot().player.heat).toBe(2)
  })

  it('the same working outside the window banks the ordinary one', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    expect(sim.stoke()).toBe(true) // opened far too early
    sim.useAbility('fireball')
    advance(sim, 50)
    expect(sim.combatSnapshot().player.heat).toBe(1)
  })

  it('the flue shuts after half a second', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    sim.stoke()
    expect(sim.combatSnapshot().player.stokeTicks).toBe(STOKE_WINDOW_TICKS)
    advance(sim, STOKE_WINDOW_TICKS)
    expect(sim.combatSnapshot().player.stokeTicks).toBe(0)
  })

  it('opening it announces itself and locks the calling for three seconds', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    expect(sim.stoke()).toBe(true)
    expect(eventsOf(advance(sim, 1), 'stoked')).toBeDefined()
    expect(sim.stoke()).toBe(false) // still cooling
    advance(sim, STOKE_CD_TICKS)
    expect(sim.combatSnapshot().player.stokeReady).toBe(true)
    expect(sim.stoke()).toBe(true)
  })

  it('a stoked gain is flagged, so the UI can pay it off', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    advance(sim, 40)
    sim.stoke()
    const gains = eventsOf(advance(sim, 10), 'heatChanged')
    expect(gains.some((e) => e.stoked)).toBe(true)
  })

  it('every offensive working of the calling feeds the fire on landing', () => {
    const sim = makeSim({ level: 11, content: teller() })
    advanceToSpawn(sim)
    sim.useAbility('kindle')
    advance(sim, 25)
    expect(sim.combatSnapshot().player.heat).toBe(1)
    sim.useAbility('detonate') // cashes the ember Kindle laid
    advance(sim, 25)
    expect(sim.combatSnapshot().player.heat).toBe(2)
    // Detonate with nothing to cash in lands on nobody, and pays nothing.
    sim.useAbility('detonate')
    advance(sim, 25)
    expect(sim.combatSnapshot().player.heat).toBe(2)
  })

  it('is sealed until the First Weaving hands over Fireball', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    // A conscript still in the proving: taught nothing, so no fire to stoke.
    sim.setTaught([])
    expect(sim.stoke()).toBe(false)
    expect(sim.combatSnapshot().player.stokeTicks).toBe(0)
    // The First Weaving arms the calling.
    sim.setTaught(['fireball'])
    expect(sim.stoke()).toBe(true)
    expect(sim.combatSnapshot().player.stokeTicks).toBe(STOKE_WINDOW_TICKS)
  })

  it('only the Arcanist has this calling', () => {
    const grave = makeSim({ level: 5, identity: { classId: 'gravewright', originId: '', signId: '' } })
    advanceToSpawn(grave)
    expect(grave.stoke()).toBe(false)
  })
})

describe('openings — a foe cracked wide', () => {
  it('a foe deep in its wind-up shows a tell', () => {
    const sim = makeSim({ content: teller() })
    advanceToSpawn(sim)
    advance(sim, 26) // past 60% of a 40-tick wind-up
    expect(targetOf(sim)?.combatState).toBe('telegraph')
  })

  it('an Exposed foe takes more from your fire', () => {
    const hit = (expose: boolean): number => {
      const sim = makeSim({ level: 9, seed: 3, content: teller() })
      advanceToSpawn(sim)
      sim.useAbility('kindle')
      advance(sim, 25)
      if (expose) {
        sim.useAbility('flashpoint')
        advance(sim, 25)
      }
      sim.useAbility('detonate')
      return eventsOf(advance(sim, 3), 'damage').find((e) => e.source === 'detonate')?.amount ?? 0
    }
    expect(hit(true)).toBeGreaterThan(hit(false))
  })

  it('Kindle into an Opening lays two Smolder instead of one', () => {
    const sim = makeSim({ level: 9, content: teller() })
    advanceToSpawn(sim)
    sim.useAbility('fireball') // bank the Heat Flashpoint spends
    advance(sim, 50)
    sim.useAbility('flashpoint')
    advance(sim, 25)
    const before = targetOf(sim)?.smolder?.stacks ?? 0
    sim.useAbility('kindle')
    advance(sim, 2)
    expect((targetOf(sim)?.smolder?.stacks ?? 0) - before).toBe(2)
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
