import { describe, expect, it } from 'vitest'
import type { EncounterDef, EnemyDef } from '../src/engine/types'
import { advance, advanceToSpawn, dummyEnemy, eventsOf, makeSim, targetOf, testContent } from './helpers'

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
    content: testContent({}, { enemies: vanguardMobs(over), zone1Encounters: VANGUARD }),
  })
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
    sim.useAbility('ignite')
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

  it('counterspell reads the target: another mob casting does not enable it', () => {
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
          zone1Encounters: [
            { weight: 1, slots: [{ enemyId: 'silent' }, { enemyId: 'chanter', row: 'back' }] },
          ],
        },
      ),
    })
    advanceToSpawn(sim)
    advance(sim, 55) // chanter's first cast starts at cooldown/2 = 50
    const chanter = sim.combatSnapshot().enemies.find((e) => e.defId === 'chanter')!
    expect(chanter.cast).not.toBeNull()
    // Target is the silent front mob: counterspell must refuse.
    expect(targetOf(sim)?.defId).toBe('silent')
    expect(sim.canUse('counterspell')).toBe(false)
    // Switch to the caster: now it fires and interrupts.
    sim.setTarget(chanter.iid)
    expect(sim.canUse('counterspell')).toBe(true)
    expect(sim.useAbility('counterspell')).toBe(true)
    const events = advance(sim, 1)
    expect(eventsOf(events, 'interrupted').map((e) => e.iid)).toEqual([chanter.iid])
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

  it('clearing the pack pays each mob and resolves the node', () => {
    const sim = vanguardSim({ hp: 1 }, 15)
    sim.embark()
    const events: ReturnType<typeof advance> = []
    for (let i = 0; i < 2000 && eventsOf(events, 'encounterCleared').length === 0; i++) {
      const s = sim.combatSnapshot()
      if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
      events.push(...sim.tick())
    }
    expect(eventsOf(events, 'enemyDied')).toHaveLength(3)
    expect(eventsOf(events, 'encounterCleared')).toHaveLength(1)
    const xp = eventsOf(events, 'xpGained').reduce((sum, e) => sum + e.amount, 0)
    expect(xp).toBe(30) // 5 + 5 + 20 — every mob pays
    expect(eventsOf(events, 'nodeResolved').some((e) => e.index === 0)).toBe(true)
    const snap = sim.combatSnapshot()
    expect(snap.enemies).toHaveLength(0)
    expect(snap.target).toBeNull()
    expect(snap.expedition!.nodeResolved).toBe(true)
  })

  it('the boss node spawns the zone boss alone', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1 }) })
    sim.autoBattle = true
    let bossSpawn: number | null = null
    for (let i = 0; i < 20_000 && bossSpawn === null; i++) {
      for (const e of sim.tick()) {
        if (e.kind === 'enemySpawned' && e.rank === 'boss') bossSpawn = e.iid
      }
    }
    expect(bossSpawn).not.toBeNull()
    expect(sim.combatSnapshot().enemies.filter((e) => e.alive)).toHaveLength(1)
    expect(sim.combatSnapshot().enemies[0]!.rank).toBe('boss')
  })
})
