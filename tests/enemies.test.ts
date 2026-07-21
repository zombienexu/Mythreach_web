import { describe, expect, it } from 'vitest'
import type { HeroIdentity } from '../src/engine/types'
import { advance, advanceTimeline, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** A no-DoT damage vehicle for enemy-behaviour tests — the Gravewright's bolt
 *  chips a foe down without a lingering burn that would finish it off. */
const gw: HeroIdentity = { classId: 'gravewright', originId: '', signId: '' }

describe('enemy swings', () => {
  it('lands the first swing one swing-interval after spawning, none a tick earlier', () => {
    const sim = makeSim({ content: testContent({ swingTicks: 44, dmgMin: 5, dmgMax: 9 }) })
    const spawnEvents = advanceToSpawn(sim)
    expect(eventsOf(spawnEvents, 'enemySpawned')).toHaveLength(1)
    // The spawn tick itself counts as the first wind-up tick.
    const before = advance(sim, 42)
    expect(eventsOf(before, 'damage').filter((e) => e.target === 'player')).toHaveLength(0)
    const at = sim.tick()
    const hits = eventsOf(at, 'damage').filter((e) => e.target === 'player')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.source).toBe('enemySwing')
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(5)
    expect(hits[0]!.amount).toBeLessThanOrEqual(9)
  })

  it('swings keep landing on a fixed cadence', () => {
    const sim = makeSim({ content: testContent({ swingTicks: 30, dmgMin: 1, dmgMax: 1 }) })
    advanceToSpawn(sim)
    const start = sim.combatSnapshot().tick
    const timeline = advanceTimeline(sim, 155)
    const swingTicks = timeline
      .filter(({ events }) => events.some((e) => e.kind === 'damage' && e.source === 'enemySwing'))
      .map(({ tick }) => tick - start)
    expect(swingTicks).toEqual([29, 59, 89, 119, 149])
  })
})

describe('dormant pack — the free first strike', () => {
  it('a freshly-spawned pack stands dormant: no swings until the player strikes', () => {
    const sim = makeSim({ content: testContent({ swingTicks: 20, dmgMin: 5, dmgMax: 5 }) })
    advanceToSpawn(sim, { engage: false })
    expect(sim.combatSnapshot().engaged).toBe(false)
    // Well past a swing interval, the dormant pack lands nothing on the hero.
    const idle = advance(sim, 120)
    expect(eventsOf(idle, 'damage').filter((e) => e.target === 'player')).toHaveLength(0)
    expect(sim.combatSnapshot().engaged).toBe(false)
    expect(sim.combatSnapshot().player.hp).toBe(sim.combatSnapshot().player.maxHp)
  })

  it("the player's first strike pulls aggro and the field wakes", () => {
    const sim = makeSim({ level: 15, identity: gw, content: testContent({ hp: 10_000, swingTicks: 20, dmgMin: 5, dmgMax: 5 }) })
    advanceToSpawn(sim, { engage: false })
    // Land the opener: a gravebolt on the marked foe.
    sim.useAbility('gravebolt')
    const opener = advance(sim, 40)
    expect(eventsOf(opener, 'damage').filter((e) => e.target === 'enemy').length).toBeGreaterThan(0)
    expect(sim.combatSnapshot().engaged).toBe(true)
    // Now roused, the pack swings back within a swing interval.
    const retaliation = advance(sim, 40)
    expect(eventsOf(retaliation, 'damage').filter((e) => e.source === 'enemySwing').length).toBeGreaterThan(0)
  })
})

describe('enrage', () => {
  const enrageContent = () =>
    testContent({
      hp: 100,
      swingTicks: 40,
      dmgMin: 10,
      dmgMax: 10,
      mechanics: [{ kind: 'enrage', hpPct: 30, swingMult: 0.5, dmgMult: 2 }],
    })

  it('fires once when HP crosses the threshold', () => {
    // Gravebolt (no lingering burn) so we can walk it across the line cleanly.
    const sim = makeSim({ level: 15, identity: gw, content: enrageContent() })
    advanceToSpawn(sim)
    let enrages = eventsOf([], 'enemyEnraged')
    for (let i = 0; i < 8 && targetOf(sim) && !targetOf(sim)!.enraged; i++) {
      sim.useAbility('gravebolt')
      enrages = enrages.concat(eventsOf(advance(sim, 44), 'enemyEnraged'))
    }
    expect(enrages.length).toBe(1)
    expect(targetOf(sim)?.enraged).toBe(true)
  })

  it('speeds up and hardens swings', () => {
    // Meatier than enrageContent: the auto-strike must not kill it during the
    // 45-tick observation, or the second enraged swing never lands.
    const sim = makeSim({
      level: 15,
      identity: gw,
      content: testContent({
        hp: 300,
        swingTicks: 40,
        dmgMin: 10,
        dmgMax: 10,
        mechanics: [{ kind: 'enrage', hpPct: 30, swingMult: 0.5, dmgMult: 2 }],
      }),
    })
    advanceToSpawn(sim)
    // Chip it below 30% HP without a lingering burn that would finish it off.
    // (Strikes hold during casts, so the chip is nearly all gravebolt.)
    for (let i = 0; i < 14 && targetOf(sim) && !targetOf(sim)!.enraged; i++) {
      sim.useAbility('gravebolt')
      advance(sim, 44)
    }
    const enemy = targetOf(sim)
    expect(enemy?.enraged).toBe(true)
    const timeline = advanceTimeline(sim, 45)
    const hits = timeline.flatMap(({ events }) =>
      eventsOf(events, 'damage').filter((e) => e.source === 'enemySwing'),
    )
    // Enraged: doubles damage (20), halves the swing interval (2+ hits in 45 ticks).
    expect(hits.length).toBeGreaterThanOrEqual(2)
    for (const h of hits) expect(h.amount + h.absorbed).toBe(20)
  })
})

describe('venom', () => {
  it('applies a DoT to the hero that ticks for the configured damage', () => {
    const sim = makeSim({
      content: testContent({
        mechanics: [{ kind: 'venom', name: 'Test Venom', everyTicks: 100, tickDamage: 3, intervalTicks: 10, tickCount: 4 }],
      }),
    })
    advanceToSpawn(sim)
    // Venom lands at +49 (everyTicks/2, counting the spawn tick), ticks at +59/69/79/89.
    const early = advance(sim, 60)
    const applied = eventsOf(early, 'dotApplied').filter((e) => e.target === 'player')
    expect(applied).toHaveLength(1)
    expect(applied[0]!.name).toBe('Test Venom')
    expect(sim.combatSnapshot().player.dot).not.toBeNull()
    const late = advance(sim, 40)
    const venomHits = eventsOf(early.concat(late), 'damage').filter((e) => e.source === 'venom')
    expect(venomHits).toHaveLength(4)
    for (const hit of venomHits) expect(hit.amount).toBe(3)
  })
})

describe('hardcast', () => {
  it('pauses swings while casting and lands the bolt at cast end', () => {
    const sim = makeSim({
      content: testContent({
        swingTicks: 30,
        dmgMin: 1,
        dmgMax: 1,
        mechanics: [{ kind: 'hardcast', name: 'Bolt', castTicks: 40, cooldownTicks: 200, dmgMin: 25, dmgMax: 25 }],
      }),
    })
    advanceToSpawn(sim)
    // Cast starts 100 ticks in (cooldown/2, counting the spawn tick).
    advance(sim, 98)
    const castStart = advance(sim, 1)
    expect(eventsOf(castStart, 'enemyCastStarted')).toHaveLength(1)
    expect(targetOf(sim)?.cast?.name).toBe('Bolt')
    const during = advance(sim, 39)
    expect(eventsOf(during, 'damage').filter((e) => e.source === 'enemySwing')).toHaveLength(0)
    const landing = sim.tick()
    const bolt = eventsOf(landing, 'damage').filter((e) => e.source === 'enemyCast')
    expect(bolt).toHaveLength(1)
    expect(bolt[0]!.amount).toBe(25)
    expect(bolt[0]!.label).toBe('Bolt')
  })
})

describe('between-pack recovery', () => {
  it('the hero mends after clearing a pack', () => {
    // A single mob that hits but has few HP: clear it, then recover in the lull.
    const sim = makeSim({ content: testContent({ hp: 1, swingTicks: 20, dmgMin: 15, dmgMax: 15 }) })
    advanceToSpawn(sim)
    // Sample after its swing at +20 but before the auto-strike kills it at
    // +36 — the clear-heal would otherwise mend the wound before we read it.
    advance(sim, 30)
    const hurt = sim.combatSnapshot().player.hp
    expect(hurt).toBeLessThan(sim.combatSnapshot().player.maxHp)
    // Kill the mob; the clear-heal + breather regen lift HP above the low.
    // Sample the peak before the next pack can swing back.
    let peak = hurt
    for (let i = 0; i < 120; i++) {
      const s = sim.combatSnapshot()
      if (s.enemies.some((e) => e.alive) && s.cast === null && s.queued === null) sim.useAbility('fireball')
      sim.tick()
      peak = Math.max(peak, sim.combatSnapshot().player.hp)
    }
    expect(peak).toBeGreaterThan(hurt)
  })
})

describe('death and respawn', () => {
  it('the hero dies, the field clears, and they revive at full and keep hunting', () => {
    const sim = makeSim({ content: testContent({ swingTicks: 10, dmgMin: 40, dmgMax: 40 }) })
    advanceToSpawn(sim)
    const events = advance(sim, 40) // three swings kill a 100 HP hero
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    expect(sim.combatSnapshot().player.alive).toBe(false)
    const later = advance(sim, 100)
    expect(eventsOf(later, 'playerRespawned')).toHaveLength(1)
    const snap = sim.combatSnapshot()
    expect(snap.player.hp).toBe(snap.player.maxHp)
    expect(snap.phase).toBe('idle')
    // The next fight is a click away.
    const respawned = advanceToSpawn(sim)
    expect(eventsOf(respawned, 'enemySpawned').length).toBeGreaterThanOrEqual(1)
  })

  it('death cancels the cast, clears the queue and venom', () => {
    const sim = makeSim({
      level: 5,
      content: testContent({
        swingTicks: 12,
        dmgMin: 60,
        dmgMax: 60,
        mechanics: [{ kind: 'venom', name: 'Venom', everyTicks: 10, tickDamage: 1, intervalTicks: 5, tickCount: 10 }],
      }),
    })
    advanceToSpawn(sim)
    sim.useAbility('fireball') // a cast in flight
    sim.useAbility('kindle') // queued behind it
    const events = advance(sim, 40)
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    const snap = sim.combatSnapshot()
    expect(snap.cast).toBeNull()
    expect(snap.queued).toBeNull()
    expect(snap.player.dot).toBeNull()
  })
})
