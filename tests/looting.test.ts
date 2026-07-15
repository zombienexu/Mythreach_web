import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../src/engine/events'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { EncounterDef, EnemyDef, Item } from '../src/engine/types'
import { INVENTORY_CAP } from '../src/engine/types'
import { advance, advanceToSpawn, dummyEnemy, eventsOf, makeSim, testContent } from './helpers'

/** Start a fight and fireball it down, stopping ON the loot screen. */
function clearPack(sim: GameSim): CombatEvent[] {
  const events = advanceToSpawn(sim)
  for (let i = 0; i < 4000; i++) {
    if (sim.combatSnapshot().phase === 'looting') return events
    const s = sim.combatSnapshot()
    if (s.enemies.length > 0 && s.cast === null && s.queued === null) sim.useAbility('fireball')
    events.push(...sim.tick())
  }
  throw new Error('pack not cleared within budget')
}

/** A 3-mob pack whose bundles are exact: 2 + 2 + 4 gold. */
const TRIO: EncounterDef[] = [
  { weight: 1, slots: [{ enemyId: 'g1' }, { enemyId: 'g2' }, { enemyId: 'g3' }] },
]
function trioMobs(): EnemyDef[] {
  return [
    dummyEnemy({ id: 'g1', name: 'Grunt One', hp: 1, xp: 5, goldMin: 2, goldMax: 2 }),
    dummyEnemy({ id: 'g2', name: 'Grunt Two', hp: 1, xp: 5, goldMin: 2, goldMax: 2 }),
    dummyEnemy({ id: 'g3', name: 'Grunt Three', hp: 1, xp: 20, goldMin: 4, goldMax: 4 }),
  ]
}
function trioSim() {
  return makeSim({
    level: 15,
    content: testContent({}, { enemies: trioMobs(), region1Encounters: TRIO }),
  })
}

describe('loot bundles', () => {
  it('a kill pays xp immediately but banks gold on the corpse', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1, goldMin: 5, goldMax: 5 }) })
    const events = clearPack(sim)
    expect(eventsOf(events, 'xpGained').length).toBeGreaterThanOrEqual(1)
    expect(eventsOf(events, 'goldGained')).toHaveLength(0)
    expect(sim.progressSnapshot().gold).toBe(0)
    const corpse = sim.combatSnapshot().enemies[0]!
    expect(corpse.alive).toBe(false)
    expect(corpse.loot?.gold).toBe(5)
  })

  it('clearing the pack enters looting and keeps the corpses', () => {
    const sim = trioSim()
    const events = clearPack(sim)
    expect(eventsOf(events, 'encounterCleared')).toHaveLength(1)
    const snap = sim.combatSnapshot()
    expect(snap.phase).toBe('looting')
    expect(snap.enemies).toHaveLength(3)
    expect(snap.enemies.every((e) => !e.alive && e.loot !== null)).toBe(true)
  })

  it('collectLoot pays one corpse; the last collect returns to idle', () => {
    const sim = trioSim()
    clearPack(sim)
    const corpses = sim.combatSnapshot().enemies
    expect(sim.collectLoot(9999)).toBe(false)
    const first = corpses[0]!
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.collectLoot(first.iid)).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + first.loot!.gold)
    expect(sim.collectLoot(first.iid)).toBe(false) // already looted
    expect(sim.combatSnapshot().phase).toBe('looting')
    expect(sim.collectLoot(corpses[1]!.iid)).toBe(true)
    expect(sim.collectLoot(corpses[2]!.iid)).toBe(true)
    const snap = sim.combatSnapshot()
    expect(snap.phase).toBe('idle')
    expect(snap.enemies).toHaveLength(0)
    expect(snap.target).toBeNull()
    expect(sim.collectLoot(corpses[0]!.iid)).toBe(false) // nothing left to loot
  })

  it('collectAllLoot pays everything at once', () => {
    const sim = trioSim()
    clearPack(sim)
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.collectAllLoot()).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + 8) // 2 + 2 + 4
    expect(sim.combatSnapshot().phase).toBe('idle')
    expect(sim.collectAllLoot()).toBe(false)
  })

  it('items ride the bundle and land in the bags on collect', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1, dropPct: 100 }) })
    clearPack(sim)
    const corpse = sim.combatSnapshot().enemies[0]!
    expect(corpse.loot?.items).toHaveLength(1)
    expect(sim.progressSnapshot().inventory).toHaveLength(0)
    sim.collectAllLoot()
    const events = advance(sim, 1)
    const drops = eventsOf(events, 'lootDropped')
    expect(drops).toHaveLength(1)
    expect(drops[0]!.autoSold).toBe(false)
    expect(sim.progressSnapshot().inventory).toHaveLength(1)
  })

  it('collected items auto-sell when the bags are full', () => {
    const bagFiller: Item[] = Array.from({ length: INVENTORY_CAP }, (_, i) => ({
      uid: 200 + i,
      name: `Filler ${i}`,
      slot: 'ring',
      ilvl: 1,
      rarity: 'common',
      stats: { power: 1 },
    }))
    const sim = makeSim({
      level: 15,
      save: { inventory: bagFiller, nextUid: 500 },
      content: testContent({ hp: 1, dropPct: 100 }),
    })
    clearPack(sim)
    sim.collectAllLoot()
    const events = advance(sim, 1)
    const drops = eventsOf(events, 'lootDropped')
    expect(drops).toHaveLength(1)
    expect(drops[0]!.autoSold).toBe(true)
    expect(sim.progressSnapshot().inventory).toHaveLength(INVENTORY_CAP)
  })

  it('materials ride the bundle and count only once collected', () => {
    const sim = makeSim({ seed: 7, level: 15, content: testContent({ hp: 1, dropPct: 0 }) })
    const total = () =>
      sim.progressSnapshot().materials.reduce((sum, m) => sum + m.count, 0)
    let verified = false
    for (let round = 0; round < 60 && !verified; round++) {
      clearPack(sim)
      const stacks = sim
        .combatSnapshot()
        .enemies.flatMap((e) => e.loot?.materials ?? [])
      const before = total()
      sim.collectAllLoot()
      if (stacks.length > 0) {
        const banked = stacks.reduce((sum, m) => sum + m.count, 0)
        expect(total()).toBe(before + banked)
        expect(stacks.every((m) => m.id === 'test-scrap')).toBe(true) // r1's only material
        verified = true
      }
    }
    expect(verified).toBe(true)
  })
})

describe('loot is never destroyed', () => {
  it('enterRegion banks a pending loot screen', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1, goldMin: 3, goldMax: 3 }) })
    clearPack(sim)
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.enterRegion('r2')).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + 3)
    expect(sim.combatSnapshot().phase).toBe('idle')
    expect(sim.progressSnapshot().regionId).toBe('r2')
  })

  it('death banks what was already slain', () => {
    const content = testContent(
      {},
      {
        enemies: [
          dummyEnemy({ id: 'victim', hp: 1, goldMin: 7, goldMax: 7 }),
          dummyEnemy({ id: 'killer', hp: 5000, swingTicks: 80, dmgMin: 9999, dmgMax: 9999 }),
        ],
        region1Encounters: [
          { weight: 1, slots: [{ enemyId: 'victim' }, { enemyId: 'killer' }] },
        ],
      },
    )
    const sim = makeSim({ level: 15, content })
    advanceToSpawn(sim)
    sim.useAbility('fireball') // fells the victim before the killer's first swing
    let died = false
    for (let i = 0; i < 2000 && !died; i++) {
      if (sim.tick().some((e) => e.kind === 'playerDied')) died = true
    }
    expect(died).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(7) // the victim's bundle, banked
    expect(sim.combatSnapshot().phase).toBe('idle')
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
    expect(sim.startFight()).toBe(false) // still dead
  })

  it('assaulting from the loot screen banks it, and retreat ends in idle', () => {
    const sim = makeSim({ level: 12, content: testContent({ hp: 1, goldMin: 3, goldMax: 3 }) })
    clearPack(sim)
    const goldBefore = sim.progressSnapshot().gold
    expect(sim.assaultWorldBoss()).toBe(true)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + 3)
    expect(sim.startFight()).toBe(false) // mid-assault
    expect(sim.retreat()).toBe(true)
    expect(sim.combatSnapshot().phase).toBe('idle')
  })
})

describe('the discrete loop end to end', () => {
  it('auto-battle plays the whole loop alone', () => {
    const sim = makeSim({ level: 15, content: testContent({ hp: 1 }) })
    sim.autoBattle = true
    const events = advance(sim, 600)
    expect(eventsOf(events, 'enemySpawned').length).toBeGreaterThanOrEqual(1)
    expect(eventsOf(events, 'encounterCleared').length).toBeGreaterThanOrEqual(1)
    expect(sim.progressSnapshot().gold).toBeGreaterThan(0)
  })

  it('deserialize lands in idle, ready to fight', () => {
    const content = testContent()
    const sim = makeSim({ content })
    const restored = GameSim.deserialize(sim.serialize(), { content, rng: mulberry32(2) })
    expect(restored.combatSnapshot().phase).toBe('idle')
    expect(restored.startFight()).toBe(true)
  })
})
