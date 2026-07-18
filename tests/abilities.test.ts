import { describe, expect, it } from 'vitest'
import { ABILITIES, ABILITY_EFFECTS, ABILITY_IDS } from '../src/engine/abilities'
import { CLASS_KITS } from '../src/engine/content/classes'
import { GCD_TICKS } from '../src/engine/types'
import { advance, advanceToSpawn, eventsOf, makeSim, testContent } from './helpers'

describe('casting and the GCD', () => {
  it('fireball resolves after exactly 44 ticks (damage at 44, none at 43)', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    expect(sim.useAbility('fireball')).toBe(true)
    const before = advance(sim, 43)
    expect(eventsOf(before, 'damage').filter((e) => e.target === 'enemy')).toHaveLength(0)
    const at44 = sim.tick()
    expect(eventsOf(at44, 'castFinished')).toHaveLength(1)
    const dmg = eventsOf(at44, 'damage').filter((e) => e.target === 'enemy')
    expect(dmg).toHaveLength(1)
    expect(dmg[0]!.source).toBe('fireball')
  })

  it('spends mana at cast resolution, not at cast start', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    const full = sim.combatSnapshot().player.mana
    sim.useAbility('fireball')
    advance(sim, 43)
    expect(sim.combatSnapshot().player.mana).toBe(full)
    sim.tick()
    expect(sim.combatSnapshot().player.mana).toBe(full - 14)
  })

  it('an instant triggers the GCD; a second press queues and fires when it clears', () => {
    const sim = makeSim()
    advanceToSpawn(sim)
    expect(sim.useAbility('ignite')).toBe(true)
    expect(sim.combatSnapshot().gcdRemaining).toBe(GCD_TICKS)
    // Fireball is accepted but queued, not cast.
    expect(sim.useAbility('fireball')).toBe(true)
    expect(sim.combatSnapshot().queued).toBe('fireball')
    expect(sim.combatSnapshot().cast).toBeNull()
    const during = advance(sim, GCD_TICKS - 1)
    expect(eventsOf(during, 'abilityQueued')).toHaveLength(1)
    expect(eventsOf(during, 'castStarted')).toHaveLength(0)
    const atGcdEnd = sim.tick()
    expect(eventsOf(atGcdEnd, 'castStarted')).toHaveLength(1)
    expect(sim.combatSnapshot().queued).toBeNull()
  })

  it('an ability pressed mid-cast queues and starts the same tick the cast resolves', () => {
    const sim = makeSim({ level: 2 })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    advance(sim, 10)
    expect(sim.useAbility('renew')).toBe(true)
    expect(sim.combatSnapshot().queued).toBe('renew')
    const rest = advance(sim, 34) // fireball resolves on the 44th cast tick
    expect(eventsOf(rest, 'castFinished')).toHaveLength(1)
    const started = eventsOf(rest, 'castStarted')
    expect(started).toHaveLength(1)
    expect(started[0]!.abilityId).toBe('renew')
  })

  it('a press during a cast replaces the queue; never double-casts', () => {
    const sim = makeSim({ level: 4 })
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    sim.useAbility('pyroblast')
    sim.useAbility('ignite') // replaces pyroblast in the queue
    expect(sim.combatSnapshot().queued).toBe('ignite')
    expect(sim.combatSnapshot().cast?.abilityId).toBe('fireball')
  })

  it('cooldown starts when the ability resolves, not when the cast starts', () => {
    const sim = makeSim({ level: 2 })
    advanceToSpawn(sim)
    sim.useAbility('renew')
    advance(sim, 10)
    expect(sim.combatSnapshot().cooldowns.renew).toBe(0)
    advance(sim, 26) // renew cast is 36 ticks
    expect(sim.combatSnapshot().cooldowns.renew).toBe(100)
  })

  it('a cast fizzles (and refunds mana) when the target dies mid-cast', () => {
    // Enemy with 25 HP: ignite (5 dmg × 6) kills it on the 5th burn tick (+100).
    const sim = makeSim({ seed: 5, content: testContent({ hp: 25 }) })
    advanceToSpawn(sim)
    sim.useAbility('ignite')
    advance(sim, 60) // burns at +20/+40/+60 → 10 HP left
    const manaBefore = sim.combatSnapshot().player.mana
    sim.useAbility('fireball') // 44-tick cast resolves at +104, after the kill at +100
    const events = advance(sim, 60)
    expect(eventsOf(events, 'enemyDied')).toHaveLength(1)
    expect(eventsOf(events, 'castFizzled')).toHaveLength(1)
    expect(eventsOf(events, 'castFinished')).toHaveLength(0)
    // Mana was never spent on the fizzle (regen may even have added some back).
    expect(sim.combatSnapshot().player.mana).toBeGreaterThanOrEqual(manaBefore)
  })

  it('an offensive queued ability is dropped when the enemy dies', () => {
    // 5 HP enemy: ignite's first burn (+20) kills it before the GCD (24) frees the queue.
    const sim = makeSim({ content: testContent({ hp: 5 }) })
    advanceToSpawn(sim)
    sim.useAbility('ignite')
    sim.useAbility('fireball')
    expect(sim.combatSnapshot().queued).toBe('fireball')
    const events = advance(sim, 30)
    expect(eventsOf(events, 'enemyDied')).toHaveLength(1)
    expect(eventsOf(events, 'castStarted')).toHaveLength(0)
    expect(sim.combatSnapshot().queued).toBeNull()
  })

  it('offensive abilities are refused with no enemy on the field', () => {
    const sim = makeSim()
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    expect(sim.useAbility('fireball')).toBe(false)
    expect(sim.useAbility('ignite')).toBe(false)
  })

  it('locked abilities are refused below their unlock level', () => {
    const sim = makeSim({ level: 1 })
    advanceToSpawn(sim)
    expect(sim.canUse('renew')).toBe(false)
    expect(sim.canUse('pyroblast')).toBe(false)
    expect(sim.useAbility('pyroblast')).toBe(false)
    const sim4 = makeSim({ level: 4 })
    advanceToSpawn(sim4)
    expect(sim4.canUse('pyroblast')).toBe(true)
  })

  it('runs dry eventually and refuses casts until regen catches up', () => {
    const sim = makeSim({ content: testContent({ hp: 1_000_000 }) })
    advanceToSpawn(sim)
    let refused = false
    for (let i = 0; i < 6000 && !refused; i++) {
      const snap = sim.combatSnapshot()
      if (snap.cast === null && snap.queued === null && !sim.useAbility('fireball')) {
        refused = true
        expect(sim.combatSnapshot().player.mana).toBeLessThan(14)
      }
      sim.tick()
    }
    expect(refused).toBe(true)
  })
})

// The registration contract. ABILITY_IDS is a plain array, so an ability that
// exists in ABILITIES but was never added to it fails *silently* — it simply
// never appears on the action bar, and its cooldown/usable/denied slots (all
// derived from ABILITY_IDS) go missing. These assertions turn that into a
// build failure, which is what the "adding an ability" guide promises.
describe('ability registration', () => {
  it('ABILITY_IDS lists every ability in ABILITIES, exactly once', () => {
    expect([...ABILITY_IDS].sort()).toEqual(Object.keys(ABILITIES).sort())
    expect(new Set(ABILITY_IDS).size).toBe(ABILITY_IDS.length)
  })

  it('every ability has an effect, a per-class unique hotkey, and a sane unlock level', () => {
    for (const id of ABILITY_IDS) {
      expect(ABILITY_EFFECTS[id], `${id} has no effect`).toBeDefined()
      expect(ABILITIES[id].id, `${id} key mismatch`).toBe(id)
      expect(ABILITIES[id].unlockLevel).toBeGreaterThanOrEqual(1)
      expect(ABILITIES[id].castTicks).toBeGreaterThanOrEqual(0)
      expect(ABILITIES[id].cooldownTicks).toBeGreaterThanOrEqual(0)
    }
    // Hotkeys are per class: each calling's bar is 1..n with no repeats.
    for (const kit of Object.values(CLASS_KITS)) {
      const keys = kit.abilities.map((id) => ABILITIES[id].key)
      expect(new Set(keys).size, `${kit.id}: two abilities share a hotkey`).toBe(keys.length)
      for (const id of kit.abilities) {
        expect(ABILITIES[id].classId, `${id} listed in ${kit.id}'s kit but owned elsewhere`).toBe(kit.id)
      }
    }
    // Every calling starts with something to press at level 1.
    for (const kit of Object.values(CLASS_KITS)) {
      expect(
        kit.abilities.some((id) => ABILITIES[id].unlockLevel === 1),
        `${kit.id} has no level-1 ability`,
      ).toBe(true)
    }
  })
})
