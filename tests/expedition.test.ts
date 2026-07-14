import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../src/engine/events'
import { generateRoute } from '../src/engine/expedition'
import { mulberry32 } from '../src/engine/rng'
import type { GameSim } from '../src/engine/sim'
import type { BlessingId, NodeKind, ZoneDef } from '../src/engine/types'
import { NODE_SPAWN_TICKS, TRAVEL_TICKS } from '../src/engine/types'
import { advance, eventsOf, makeSim, testContent } from './helpers'

const ZONE: ZoneDef = testContent().zones[0]!
const routeOf = (seed: number): NodeKind[] => generateRoute(mulberry32(seed), ZONE)

/** Advance, casting fireball at whatever is in front, until the current node is
 *  resolved / a shrine is pending / the expedition ends / we are back at camp. */
function settle(sim: GameSim, max = 8000): CombatEvent[] {
  const out: CombatEvent[] = []
  for (let i = 0; i < max; i++) {
    const s = sim.combatSnapshot()
    const e = s.expedition
    if (s.phase === 'camp') break
    if (e?.pendingShrine) break
    if (s.phase === 'node' && e?.nodeResolved && s.enemies.length === 0) break
    if (s.enemies.length > 0 && s.cast === null && s.queued === null && s.player.alive) {
      sim.useAbility('fireball')
    }
    out.push(...sim.tick())
    if (out.some((ev) => ev.kind === 'playerDied')) break
  }
  return out
}

describe('generateRoute', () => {
  it('always starts with a battle and ends with the boss', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const route = routeOf(seed)
      expect(route).toHaveLength(9)
      expect(route[0]).toBe('battle')
      expect(route.at(-1)).toBe('boss')
    }
  })

  it('never places rest after rest nor an early elite', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const route = routeOf(seed)
      expect(route[0]).not.toBe('elite')
      expect(route[1]).not.toBe('elite')
      for (let i = 1; i < route.length; i++) {
        if (route[i] === 'rest') expect(route[i - 1]).not.toBe('rest')
      }
    }
  })

  it('is deterministic for a given rng seed', () => {
    expect(generateRoute(mulberry32(42), ZONE)).toEqual(generateRoute(mulberry32(42), ZONE))
  })
})

describe('expedition state machine', () => {
  it('boots at camp with no enemies and embark generates a 9-node route', () => {
    const sim = makeSim()
    const snap = sim.combatSnapshot()
    expect(snap.phase).toBe('camp')
    expect(snap.expedition).toBeNull()
    expect(snap.enemies).toHaveLength(0)

    expect(sim.embark()).toBe(true)
    const exp = sim.combatSnapshot().expedition
    expect(exp).not.toBeNull()
    expect(exp!.total).toBe(9)
    expect(exp!.traveling).toBe(true)
    const events = sim.tick()
    expect(eventsOf(events, 'expeditionStarted')).toHaveLength(1)
    expect(eventsOf(events, 'travelStarted')).toHaveLength(1)
  })

  it('travel takes TRAVEL_TICKS and arrives at a battle that spawns in NODE_SPAWN_TICKS', () => {
    const sim = makeSim()
    sim.embark()
    const arriving = advance(sim, TRAVEL_TICKS)
    expect(eventsOf(arriving, 'nodeArrived')).toEqual([
      { kind: 'nodeArrived', index: 0, nodeKind: 'battle' },
    ])
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    advance(sim, NODE_SPAWN_TICKS)
    expect(sim.combatSnapshot().enemies.length).toBeGreaterThan(0)
  })

  it('clearing the pack resolves the node and advance() starts the next travel', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    sim.embark()
    const events = settle(sim)
    expect(eventsOf(events, 'nodeResolved').some((e) => e.index === 0)).toBe(true)
    expect(sim.combatSnapshot().expedition!.nodeResolved).toBe(true)
    expect(sim.advance()).toBe(true)
    const next = sim.tick()
    const travel = eventsOf(next, 'travelStarted')
    expect(travel).toHaveLength(1)
    expect(travel[0]!.toIndex).toBe(1)
    expect(ZONE.travelLines).toContain(travel[0]!.flavor)
  })

  it('advance() is refused mid-combat and at camp', () => {
    const sim = makeSim({ content: testContent({ hp: 1 }) })
    expect(sim.advance()).toBe(false) // at camp
    sim.embark()
    advance(sim, TRAVEL_TICKS + NODE_SPAWN_TICKS) // now in combat at node 0
    expect(sim.combatSnapshot().enemies.length).toBeGreaterThan(0)
    expect(sim.advance()).toBe(false) // mid-combat
  })

  it('a cache pays gold on arrival', () => {
    let seed = -1
    for (let s = 1; s <= 60 && seed < 0; s++) if (routeOf(s).includes('cache')) seed = s
    expect(seed).toBeGreaterThan(0)
    const sim = makeSim({ seed, level: 10, content: testContent({ hp: 1 }) })
    sim.autoBattle = true
    let cache: Extract<CombatEvent, { kind: 'cacheOpened' }> | undefined
    for (let i = 0; i < 20_000 && !cache; i++) {
      cache = eventsOf(sim.tick(), 'cacheOpened')[0]
    }
    expect(cache).toBeDefined()
    expect(cache!.gold).toBeGreaterThan(0)
  })

  it('a rest node restores health', () => {
    let seed = -1
    for (let s = 1; s <= 300 && seed < 0; s++) if (routeOf(s)[1] === 'rest') seed = s
    expect(seed).toBeGreaterThan(0)
    const sim = makeSim({
      seed,
      level: 10,
      content: testContent({ hp: 240, swingTicks: 12, dmgMin: 8, dmgMax: 8 }),
    })
    sim.embark()
    settle(sim) // clear node 0 (a battle) — its swings chip the hero
    const hurt = sim.combatSnapshot().player.hp
    expect(hurt).toBeLessThan(sim.combatSnapshot().player.maxHp)
    expect(sim.advance()).toBe(true)
    const events = advance(sim, TRAVEL_TICKS + 5)
    const rested = eventsOf(events, 'rested')
    expect(rested).toHaveLength(1)
    expect(rested[0]!.hpRestored).toBeGreaterThan(0)
    expect(sim.combatSnapshot().player.hp).toBeGreaterThan(hurt)
  })

  it('a shrine offers blessings and chooseBlessing applies emberheart (hotter fire)', () => {
    // Find a seed whose first shrine offers Emberheart.
    const driveToShrine = (sim: GameSim): BlessingId[] | null => {
      sim.embark()
      for (let guard = 0; guard < 20; guard++) {
        settle(sim)
        const exp = sim.combatSnapshot().expedition
        if (!exp) return null
        if (exp.pendingShrine) return exp.pendingShrine
        if (exp.nodeResolved && exp.index < exp.total - 1) sim.advance()
        else return null
      }
      return null
    }

    // HP high enough that an ignite tick (≈7) is never capped by a dying mob,
    // so the read is a clean measure of fire scaling.
    let seed = -1
    for (let s = 1; s <= 120 && seed < 0; s++) {
      const probe = makeSim({ seed: s, level: 12, content: testContent({ hp: 50 }) })
      const offer = driveToShrine(probe)
      if (offer?.includes('emberheart')) seed = s
    }
    expect(seed).toBeGreaterThan(0)

    // Two sims, same seed: one takes Emberheart, one takes the other blessing.
    const content = testContent({ hp: 50 })
    const blessed = makeSim({ seed, level: 12, content })
    const plain = makeSim({ seed, level: 12, content })
    driveToShrine(blessed)
    const offerP = driveToShrine(plain)!
    const other = offerP.find((id) => id !== 'emberheart')!
    expect(blessed.chooseBlessing('emberheart')).toBe(true)
    expect(plain.chooseBlessing(other)).toBe(true)
    expect(blessed.combatSnapshot().expedition!.blessings).toContain('emberheart')

    // Ignite ticks never crit, so their damage is a clean read of fire scaling.
    const walkToCombat = (sim: GameSim): void => {
      for (let guard = 0; guard < 1000; guard++) {
        const s = sim.combatSnapshot()
        if (s.phase === 'camp' || s.enemies.length > 0) return
        const exp = s.expedition
        if (exp?.pendingShrine) {
          sim.chooseBlessing(exp.pendingShrine[0]!)
          continue
        }
        if (s.phase === 'node' && exp?.nodeResolved) {
          if (exp.index < exp.total - 1) sim.advance()
          else return
        }
        sim.tick()
      }
    }
    const igniteTick = (sim: GameSim): number => {
      walkToCombat(sim)
      expect(sim.combatSnapshot().enemies.length).toBeGreaterThan(0)
      sim.useAbility('ignite')
      const events = advance(sim, NODE_SPAWN_TICKS + 5)
      return eventsOf(events, 'damage').find((e) => e.source === 'ignite')?.amount ?? 0
    }
    const blessedTick = igniteTick(blessed)
    const plainTick = igniteTick(plain)
    expect(blessedTick).toBeGreaterThan(plainTick)
  })

  it('retreat returns to camp keeping loot and gold', () => {
    const sim = makeSim({ content: testContent({ hp: 1, goldMin: 5, goldMax: 5 }) })
    sim.embark()
    settle(sim) // clear node 0 — earns gold
    const gold = sim.progressSnapshot().gold
    expect(gold).toBeGreaterThan(0)
    expect(sim.retreat()).toBe(true)
    const snap = sim.combatSnapshot()
    expect(snap.phase).toBe('camp')
    expect(snap.expedition).toBeNull()
    expect(sim.progressSnapshot().gold).toBe(gold)
  })

  it('death ends the expedition and respawns at camp', () => {
    const sim = makeSim({ content: testContent({ swingTicks: 10, dmgMin: 40, dmgMax: 40 }) })
    sim.embark()
    const events = advance(sim, TRAVEL_TICKS + NODE_SPAWN_TICKS + 60)
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    expect(eventsOf(events, 'expeditionEnded')).toEqual([
      { kind: 'expeditionEnded', outcome: 'death' },
    ])
    expect(sim.combatSnapshot().phase).toBe('camp')
    expect(sim.combatSnapshot().expedition).toBeNull()
    advance(sim, 120) // respawn timer
    const snap = sim.combatSnapshot()
    expect(snap.player.alive).toBe(true)
    expect(snap.phase).toBe('camp')
  })

  it('boss node completes the expedition, unlocks the next zone, and returns to camp', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1 }) })
    sim.autoBattle = true
    let done: Extract<CombatEvent, { kind: 'expeditionEnded' }> | undefined
    const bossDefeated: CombatEvent[] = []
    for (let i = 0; i < 20_000 && !done; i++) {
      for (const e of sim.tick()) {
        if (e.kind === 'bossDefeated') bossDefeated.push(e)
        if (e.kind === 'expeditionEnded' && e.outcome === 'completed') done = e
      }
    }
    expect(done).toBeDefined()
    expect(bossDefeated).toHaveLength(1)
    expect(sim.progressSnapshot().records.expeditionsCompleted).toBe(1)
    expect(sim.combatSnapshot().phase).toBe('camp')
    expect(sim.zoneUnlocked('z2')).toBe(true)
  })

  it('node kinds ahead are masked as unknown except the boss', () => {
    const sim = makeSim()
    sim.embark()
    const nodes = sim.combatSnapshot().expedition!.nodes
    expect(nodes[0]!.kind).toBe('battle') // current, revealed
    expect(nodes[0]!.state).toBe('current')
    for (let i = 1; i < 8; i++) expect(nodes[i]!.kind).toBe('unknown')
    expect(nodes[8]!.kind).toBe('boss') // boss never masked
  })

  it('under autoBattle a full route runs hands-free', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1 }) })
    sim.autoBattle = true
    let completions = 0
    for (let i = 0; i < 20_000; i++) {
      for (const e of sim.tick()) {
        if (e.kind === 'expeditionEnded' && e.outcome === 'completed') completions++
      }
      if (completions >= 1) break
    }
    expect(completions).toBeGreaterThanOrEqual(1)
  })

  it('records the fastest boss kill per zone and keeps the minimum', () => {
    // Complete the boss twice; the first time, dawdle before killing it, so the
    // second (fast) kill sets the new minimum.
    const content = testContent({ hp: 1 })
    const runToBoss = (sim: GameSim, dawdle: number): void => {
      // walk to the boss node manually, then kill it after `dawdle` ticks
      sim.autoBattle = false
      sim.embark()
      for (let guard = 0; guard < 12; guard++) {
        settle(sim)
        const exp = sim.combatSnapshot().expedition
        if (!exp) break
        if (exp.pendingShrine) {
          sim.chooseBlessing(exp.pendingShrine[0]!)
          continue
        }
        if (exp.index === exp.total - 1) break
        if (exp.nodeResolved) sim.advance()
      }
      // arrive at the boss
      for (let i = 0; i < 4000 && sim.combatSnapshot().enemies.length === 0; i++) sim.tick()
      advance(sim, dawdle)
      // finish it off
      for (let i = 0; i < 6000; i++) {
        const s = sim.combatSnapshot()
        if (s.phase === 'camp') break
        if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
        sim.tick()
      }
    }
    const slow = makeSim({ level: 12, content })
    runToBoss(slow, 600)
    const slowRecord = slow.progressSnapshot().records.fastestBossKills['z1']
    runToBoss(slow, 0)
    const fastRecord = slow.progressSnapshot().records.fastestBossKills['z1']
    expect(slowRecord).toBeGreaterThan(0)
    expect(fastRecord).toBeLessThanOrEqual(slowRecord!)
  })
})
