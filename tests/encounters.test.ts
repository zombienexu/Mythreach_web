import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../src/engine/events'
import type { GameSim } from '../src/engine/sim'
import type { EncounterDef, EnemyDef } from '../src/engine/types'
import { PLAYER_RESPAWN_TICKS } from '../src/engine/types'
import { advance, advanceToSpawn, dummyEnemy, eventsOf, huntUntil, makeSim, targetOf, testContent } from './helpers'

/** A 3-mob vanguard: two grunts up front, one bruiser behind. */
const VANGUARD: EncounterDef[] = [
  {
    weight: 1,
    slots: [{ enemyId: 'grunt-a' }, { enemyId: 'bruiser', row: 'back' }, { enemyId: 'grunt-b' }],
  },
]

function vanguardMobs(over: Partial<EnemyDef> = {}): EnemyDef[] {
  return [
    dummyEnemy({ id: 'grunt-a', name: 'Grunt A', hp: 50, xp: 5, goldMin: 2, goldMax: 2, ...over }),
    dummyEnemy({ id: 'grunt-b', name: 'Grunt B', hp: 50, xp: 5, goldMin: 2, goldMax: 2, ...over }),
    dummyEnemy({ id: 'bruiser', name: 'Bruiser', hp: 200, xp: 20, goldMin: 4, goldMax: 4, ...over }),
  ]
}

function vanguardSim(over: Partial<EnemyDef> = {}, level = 10) {
  return makeSim({
    level,
    content: testContent({}, { enemies: vanguardMobs(over), region1Encounters: VANGUARD }),
  })
}

/** Cast fireball at every opportunity, ticking, until `stop` returns true or the
 *  tick budget runs out. Collects every event seen. */
function fight(sim: GameSim, stop: (events: CombatEvent[]) => boolean, budget = 4000): CombatEvent[] {
  const events: CombatEvent[] = []
  for (let i = 0; i < budget && !stop(events); i++) {
    const s = sim.combatSnapshot()
    if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
    events.push(...sim.tick())
  }
  return events
}

describe('encounter spawning', () => {
  it('spawns every slot of the pack with unique iids and the right rows', () => {
    const sim = vanguardSim()
    const events = advanceToSpawn(sim)
    const spawns = eventsOf(events, 'enemySpawned')
    expect(spawns.map((s) => s.defId)).toEqual(['grunt-a', 'bruiser', 'grunt-b'])
    expect(new Set(spawns.map((s) => s.iid)).size).toBe(3)

    const snap = sim.combatSnapshot()
    expect(snap.enemies.map((e) => e.row)).toEqual(['front', 'back', 'front'])
    expect(snap.enemies.map((e) => e.alive)).toEqual([true, true, true])
  })

  it('targets the first front-row mob on spawn', () => {
    const sim = vanguardSim()
    advanceToSpawn(sim)
    expect(targetOf(sim)?.defId).toBe('grunt-a')
  })
})

describe('discrete fights', () => {
  it('a new sim idles until the player starts a fight', () => {
    const sim = makeSim()
    expect(sim.combatSnapshot().phase).toBe('idle')
    advance(sim, 50)
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    expect(sim.startFight()).toBe(true)
    expect(sim.combatSnapshot().phase).toBe('combat')
    expect(sim.combatSnapshot().enemies.length).toBeGreaterThanOrEqual(1)
    expect(sim.startFight()).toBe(false) // already fighting
  })

  it('clearing a pack enters looting; looting all returns to idle', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1 }) })
    let prevIid = -1
    for (let round = 0; round < 2; round++) {
      advanceToSpawn(sim)
      const iid = sim.combatSnapshot().enemies[0]!.iid
      expect(iid).not.toBe(prevIid)
      prevIid = iid
      fight(sim, (ev) => eventsOf(ev, 'encounterCleared').length > 0)
      expect(sim.combatSnapshot().phase).toBe('looting')
      expect(sim.collectAllLoot()).toBe(true)
      expect(sim.combatSnapshot().phase).toBe('idle')
      expect(sim.combatSnapshot().enemies).toHaveLength(0)
    }
  })

  it('enterRegion switches the mob table', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1 }) })
    expect(sim.enterRegion('r1')).toBe(false) // already here
    expect(sim.enterRegion('nope')).toBe(false)
    expect(sim.enterRegion('r2')).toBe(true)
    advanceToSpawn(sim)
    expect(sim.combatSnapshot().enemies.every((e) => e.defId === 'dummy2')).toBe(true)
  })

  it('enterRegion is refused during a world-boss assault', () => {
    const sim = makeSim({ level: 12 })
    expect(sim.assaultWorldBoss()).toBe(true)
    expect(sim.enterRegion('r2')).toBe(false)
  })

  it('player death ends the fight; after respawn the next one is yours to start', () => {
    const sim = makeSim({
      level: 1,
      content: testContent({ hp: 5000, swingTicks: 40, dmgMin: 9999, dmgMax: 9999 }),
    })
    advanceToSpawn(sim)
    // Wait for the first death.
    let died = false
    for (let i = 0; i < 2000 && !died; i++) {
      if (sim.tick().some((e) => e.kind === 'playerDied')) died = true
    }
    expect(died).toBe(true)
    expect(sim.combatSnapshot().phase).toBe('idle')
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    advance(sim, PLAYER_RESPAWN_TICKS + 2)
    const snap = sim.combatSnapshot()
    expect(snap.player.alive).toBe(true)
    expect(sim.startFight()).toBe(true)
  })
})

describe('materials', () => {
  it('drop, accumulate, and belong to the current region', () => {
    const sim = makeSim({ seed: 7, level: 15, content: testContent({ hp: 1, dropPct: 0 }) })
    huntUntil(sim, () => sim.progressSnapshot().materials.length > 0)
    const mats = sim.progressSnapshot().materials
    expect(mats.length).toBeGreaterThan(0)
    expect(mats[0]!.count).toBeGreaterThanOrEqual(1)
    for (const m of mats) expect(m.id).toBe('test-scrap') // r1's only material
  })

  it('sellMaterial converts a stack to gold and clears it', () => {
    const sim = makeSim({ seed: 7, level: 15, content: testContent({ hp: 1, dropPct: 0 }) })
    huntUntil(sim, () => sim.progressSnapshot().materials.length > 0)
    const stack = sim.progressSnapshot().materials[0]!
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.sellMaterial(stack.id)).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + stack.value)
    expect(sim.progressSnapshot().materials.find((m) => m.id === stack.id)).toBeUndefined()
    expect(sim.sellMaterial('does-not-exist')).toBe(false)
  })
})

describe('targeting', () => {
  it('setTarget switches to any living mob; refuses dead or unknown iids', () => {
    const sim = vanguardSim()
    advanceToSpawn(sim)
    const back = sim.combatSnapshot().enemies.find((e) => e.defId === 'bruiser')!
    expect(sim.setTarget(back.iid)).toBe(true)
    expect(targetOf(sim)?.defId).toBe('bruiser')
    expect(sim.setTarget(back.iid)).toBe(false) // already targeted
    expect(sim.setTarget(9999)).toBe(false)
  })

  it('cycleTarget walks the living pack in field order and wraps', () => {
    const sim = vanguardSim()
    advanceToSpawn(sim)
    expect(targetOf(sim)?.defId).toBe('grunt-a')
    sim.cycleTarget()
    expect(targetOf(sim)?.defId).toBe('bruiser')
    sim.cycleTarget()
    expect(targetOf(sim)?.defId).toBe('grunt-b')
    sim.cycleTarget()
    expect(targetOf(sim)?.defId).toBe('grunt-a')
  })

  it('spells hit the target and only the target', () => {
    const sim = vanguardSim()
    advanceToSpawn(sim)
    const back = sim.combatSnapshot().enemies.find((e) => e.defId === 'bruiser')!
    sim.setTarget(back.iid)
    sim.useAbility('fireball')
    const events = advance(sim, 60)
    const hits = eventsOf(events, 'damage').filter((e) => e.target === 'enemy')
    expect(hits.length).toBeGreaterThanOrEqual(1)
    for (const h of hits) expect(h.iid).toBe(back.iid)
  })

  it('when the target dies, the next front-row mob steps up', () => {
    const sim = vanguardSim({ hp: 10 }, 15)
    advanceToSpawn(sim)
    expect(targetOf(sim)?.defId).toBe('grunt-a')
    sim.useAbility('fireball')
    const events = advance(sim, 60)
    expect(eventsOf(events, 'enemyDied').map((e) => e.defId)).toEqual(['grunt-a'])
    expect(targetOf(sim)?.defId).toBe('grunt-b') // front before back
  })

  it('a cast in flight lands on the new target instead of fizzling', () => {
    const sim = vanguardSim({ hp: 1 }, 15)
    advanceToSpawn(sim)
    // Grunts die to a stiff breeze; the fireball mid-cast must land on
    // whoever steps up after its original target dies, not fizzle.
    sim.useAbility('fireball')
    advance(sim, 10)
    sim.useAbility('kindle')
    const events = advance(sim, 80)
    expect(eventsOf(events, 'castFizzled')).toHaveLength(0)
    const deaths = eventsOf(events, 'enemyDied')
    expect(deaths.length).toBeGreaterThanOrEqual(1)
  })
})

describe('multiple attackers', () => {
  it('every living mob swings — the player takes hits from distinct iids', () => {
    const sim = vanguardSim({ swingTicks: 30, dmgMin: 1, dmgMax: 1, hp: 5000 })
    advanceToSpawn(sim)
    const events = advance(sim, 100)
    const hits = eventsOf(events, 'damage').filter((e) => e.target === 'player')
    const attackers = new Set(hits.map((h) => h.iid))
    expect(attackers.size).toBe(3)
  })

  it('a chant reads as a committed tell, even from the back row', () => {
    const sim = makeSim({
      level: 10,
      content: testContent(
        {},
        {
          enemies: [
            dummyEnemy({ id: 'silent', name: 'Silent', hp: 5000 }),
            dummyEnemy({
              id: 'chanter',
              name: 'Chanter',
              hp: 5000,
              mechanics: [
                { kind: 'hardcast', name: 'Hex', castTicks: 60, cooldownTicks: 100, dmgMin: 1, dmgMax: 1 },
              ],
            }),
          ],
          region1Encounters: [
            { weight: 1, slots: [{ enemyId: 'silent' }, { enemyId: 'chanter', row: 'back' }] },
          ],
        },
      ),
    })
    advanceToSpawn(sim)
    const tells = advance(sim, 55) // chanter's first cast starts at cooldown/2 = 50
    const chanter = sim.combatSnapshot().enemies.find((e) => e.defId === 'chanter')!
    expect(chanter.cast).not.toBeNull()
    // A hardcast is a fully-committed tell: the back row telegraphs it as
    // plainly as the front, and the announcement fires exactly once.
    expect(chanter.combatState).toBe('telegraph')
    expect(eventsOf(tells, 'tellOpened').map((e) => e.iid)).toContain(chanter.iid)
  })
})

describe('encounter lifecycle', () => {
  it('dead mobs stay on the field until the pack is cleared', () => {
    const sim = vanguardSim({ hp: 10 }, 15)
    advanceToSpawn(sim)
    sim.useAbility('fireball')
    advance(sim, 60)
    const snap = sim.combatSnapshot()
    expect(snap.enemies).toHaveLength(3)
    expect(snap.enemies.filter((e) => !e.alive)).toHaveLength(1)
  })

  it('clearing the pack pays xp at each kill; gold waits for the loot screen', () => {
    const sim = vanguardSim({ hp: 1 }, 15)
    advanceToSpawn(sim)
    const events = fight(sim, (ev) => eventsOf(ev, 'encounterCleared').length > 0)
    expect(eventsOf(events, 'enemyDied')).toHaveLength(3)
    expect(eventsOf(events, 'encounterCleared')).toHaveLength(1)
    const xp = eventsOf(events, 'xpGained').reduce((sum, e) => sum + e.amount, 0)
    expect(xp).toBe(30) // 5 + 5 + 20 — every mob pays at death
    expect(eventsOf(events, 'goldGained')).toHaveLength(0) // banked on the corpses
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.collectAllLoot()).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + 8) // 2 + 2 + 4
    const snap = sim.combatSnapshot()
    expect(snap.enemies).toHaveLength(0)
    expect(snap.target).toBeNull()
  })
})
