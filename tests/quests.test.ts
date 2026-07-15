import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { QuestDef, QuestView, SaveData } from '../src/engine/types'
import { RARITIES } from '../src/engine/content/items'
import { eventsOf, huntUntil, makeSim, testContent } from './helpers'

const TEST_QUESTS: QuestDef[] = [
  {
    id: 'tq-any',
    name: 'Cull Region One',
    giver: 'Tester',
    text: 'Anything that moves in Region One: less of it.',
    regionId: 'r1',
    objective: { kind: 'kill', enemyId: null, count: 3 },
    reward: { xp: 50, gold: 20, gear: null },
  },
  {
    id: 'tq-dummy',
    name: 'Dummy Slayer',
    giver: 'Tester',
    text: 'The dummies have it coming.',
    regionId: 'r1',
    objective: { kind: 'kill', enemyId: 'dummy', count: 2 },
    reward: { xp: 30, gold: 10, gear: null },
  },
  {
    id: 'tq-collect',
    name: 'Scrap Collector',
    giver: 'Tester',
    text: 'Scrap. Two of it. Go.',
    regionId: 'r1',
    objective: { kind: 'collect', materialId: 'test-scrap', count: 2 },
    reward: { xp: 40, gold: 15, gear: { ilvl: 5, minRarity: 'rare' } },
  },
  {
    id: 'tq-filler',
    name: 'Busywork',
    giver: 'Tester',
    text: 'A fourth ask, to prove three is the limit.',
    regionId: 'r1',
    objective: { kind: 'kill', enemyId: null, count: 99 },
    reward: { xp: 1, gold: 1, gear: null },
  },
]

function qsim(level = 15, seed = 1) {
  return makeSim({ seed, level, content: testContent({ hp: 1 }, { quests: TEST_QUESTS }) })
}

function qv(sim: GameSim, id: string): QuestView {
  const view = sim.progressSnapshot().quests.find((q) => q.id === id)
  if (!view) throw new Error(`quest not in snapshot: ${id}`)
  return view
}

describe('quest board', () => {
  it('accepting caps at three and refuses dupes and unknowns', () => {
    const sim = qsim()
    expect(sim.acceptQuest('nope')).toBe(false)
    expect(sim.acceptQuest('tq-any')).toBe(true)
    expect(sim.acceptQuest('tq-any')).toBe(false) // already active
    expect(sim.acceptQuest('tq-dummy')).toBe(true)
    expect(sim.acceptQuest('tq-collect')).toBe(true)
    expect(sim.acceptQuest('tq-filler')).toBe(false) // three underway
    expect(qv(sim, 'tq-filler').state).toBe('available')
    expect(sim.abandonQuest('tq-collect')).toBe(true)
    expect(sim.acceptQuest('tq-filler')).toBe(true) // a slot opened
  })

  it('the snapshot carries every quest with region context', () => {
    const sim = qsim()
    const quests = sim.progressSnapshot().quests
    expect(quests.map((q) => q.id)).toEqual(TEST_QUESTS.map((q) => q.id))
    const any = quests.find((q) => q.id === 'tq-any')!
    expect(any.regionName).toBe('Region One')
    expect(any.objective.targetName).toBe('any foe')
    expect(any.state).toBe('available')
    const dummy = quests.find((q) => q.id === 'tq-dummy')!
    expect(dummy.objective.targetName).toBe('Training Dummy')
    const collect = quests.find((q) => q.id === 'tq-collect')!
    expect(collect.objective.targetName).toBe('Test Scrap')
  })
})

describe('quest progress', () => {
  it('kill-any counts only in its own region', () => {
    const sim = qsim()
    expect(sim.acceptQuest('tq-any')).toBe(true)
    huntUntil(sim, () => qv(sim, 'tq-any').objective.progress >= 1)
    const progress = qv(sim, 'tq-any').objective.progress
    expect(sim.enterRegion('r2')).toBe(true)
    const killsBefore = sim.progressSnapshot().lifetime.kills
    huntUntil(sim, () => sim.progressSnapshot().lifetime.kills >= killsBefore + 2)
    expect(qv(sim, 'tq-any').objective.progress).toBe(progress) // r2 kills don't count
  })

  it('kill-specific completes exactly once and caps at count', () => {
    const sim = qsim()
    expect(sim.acceptQuest('tq-dummy')).toBe(true)
    const events = huntUntil(sim, () => qv(sim, 'tq-dummy').state === 'complete')
    expect(eventsOf(events, 'questCompleted').filter((e) => e.id === 'tq-dummy')).toHaveLength(1)
    // Keep killing: progress stays pinned, no second completion event.
    const killsBefore = sim.progressSnapshot().lifetime.kills
    const more = huntUntil(sim, () => sim.progressSnapshot().lifetime.kills >= killsBefore + 2)
    expect(eventsOf(more, 'questCompleted')).toHaveLength(0)
    expect(qv(sim, 'tq-dummy').objective.progress).toBe(2)
  })

  it('collect ticks when the stack is looted, not when it drops', () => {
    const sim = qsim(15, 7)
    expect(sim.acceptQuest('tq-collect')).toBe(true)
    let verified = false
    for (let round = 0; round < 60 && qv(sim, 'tq-collect').state !== 'complete'; round++) {
      // Fight one pack to its loot screen without collecting anything.
      huntUntil(sim, () => sim.combatSnapshot().phase === 'looting')
      const banked = sim
        .combatSnapshot()
        .enemies.flatMap((e) => e.loot?.materials ?? [])
        .filter((m) => m.id === 'test-scrap')
        .reduce((sum, m) => sum + m.count, 0)
      const before = qv(sim, 'tq-collect').objective.progress
      sim.collectAllLoot()
      const after = qv(sim, 'tq-collect').objective.progress
      expect(after).toBe(Math.min(2, before + banked)) // drops alone moved nothing
      if (banked > 0) verified = true
    }
    expect(verified).toBe(true)
    expect(qv(sim, 'tq-collect').state).toBe('complete')
  })
})

describe('turn-in', () => {
  it('refuses an incomplete quest', () => {
    const sim = qsim()
    expect(sim.turnInQuest('tq-dummy')).toBe(false) // not even accepted
    sim.acceptQuest('tq-dummy')
    expect(sim.turnInQuest('tq-dummy')).toBe(false) // no progress yet
  })

  it('pays xp, gold, and gear exactly once', () => {
    const sim = qsim(5)
    sim.acceptQuest('tq-collect')
    huntUntil(sim, () => qv(sim, 'tq-collect').state === 'complete', 20_000)
    const goldBefore = sim.progressSnapshot().gold
    const bagBefore = sim.progressSnapshot().inventory.length
    expect(sim.turnInQuest('tq-collect')).toBe(true)
    const events = sim.tick()
    expect(eventsOf(events, 'questTurnedIn').map((e) => e.id)).toEqual(['tq-collect'])
    expect(eventsOf(events, 'xpGained').some((e) => e.amount === 40)).toBe(true)
    const gold = eventsOf(events, 'goldGained').find((e) => e.source === 'quest')
    expect(gold?.amount).toBe(15)
    expect(sim.progressSnapshot().gold).toBe(goldBefore + 15)
    // The gear: one rolled item at ilvl 5, rare or better.
    const drops = eventsOf(events, 'lootDropped')
    expect(drops).toHaveLength(1)
    expect(drops[0]!.item.ilvl).toBe(5)
    expect(RARITIES.indexOf(drops[0]!.item.rarity)).toBeGreaterThanOrEqual(RARITIES.indexOf('rare'))
    expect(sim.progressSnapshot().inventory.length).toBe(bagBefore + 1)
    // Once means once.
    expect(qv(sim, 'tq-collect').state).toBe('done')
    expect(sim.turnInQuest('tq-collect')).toBe(false)
    expect(sim.acceptQuest('tq-collect')).toBe(false)
  })

  it('abandon zeroes progress and frees the quest', () => {
    const sim = qsim()
    sim.acceptQuest('tq-dummy')
    huntUntil(sim, () => qv(sim, 'tq-dummy').objective.progress >= 1)
    expect(sim.abandonQuest('tq-dummy')).toBe(true)
    expect(qv(sim, 'tq-dummy').state).toBe('available')
    expect(qv(sim, 'tq-dummy').objective.progress).toBe(0)
    expect(sim.abandonQuest('tq-dummy')).toBe(false)
    expect(sim.acceptQuest('tq-dummy')).toBe(true)
    expect(qv(sim, 'tq-dummy').objective.progress).toBe(0)
  })
})

describe('quest persistence', () => {
  it('active progress and completions survive the save round-trip', () => {
    const content = testContent({ hp: 1 }, { quests: TEST_QUESTS })
    const sim = makeSim({ level: 15, content })
    sim.acceptQuest('tq-dummy')
    sim.acceptQuest('tq-any')
    huntUntil(sim, () => qv(sim, 'tq-dummy').state === 'complete')
    expect(sim.turnInQuest('tq-dummy')).toBe(true)
    const save = sim.serialize()
    expect(save.version).toBe(4)
    const restored = GameSim.deserialize(JSON.parse(JSON.stringify(save)), {
      content,
      rng: mulberry32(2),
    })
    expect(qv(restored, 'tq-dummy').state).toBe('done')
    expect(qv(restored, 'tq-any').state).toBe(qv(sim, 'tq-any').state)
    expect(qv(restored, 'tq-any').objective.progress).toBe(qv(sim, 'tq-any').objective.progress)
  })

  it('quest ids the catalog no longer knows are dropped on load', () => {
    const content = testContent({ hp: 1 }, { quests: TEST_QUESTS })
    const sim = makeSim({ content })
    const blob = sim.serialize()
    blob.activeQuests['tq-ghost'] = 5
    blob.completedQuests.push('tq-gone')
    let restored: GameSim | undefined
    expect(() => {
      restored = GameSim.deserialize(blob, { content, rng: mulberry32(1) })
    }).not.toThrow()
    const again = restored!.serialize()
    expect(again.activeQuests['tq-ghost']).toBeUndefined()
    expect(again.completedQuests).not.toContain('tq-gone')
  })

  it('v3 saves load with every quest still available', () => {
    const content = testContent({ hp: 1 }, { quests: TEST_QUESTS })
    const sim = makeSim({ content })
    const blob = sim.serialize() as unknown as Record<string, unknown>
    blob.version = 3
    delete blob.activeQuests
    delete blob.completedQuests
    const restored = GameSim.deserialize(blob as unknown as SaveData, {
      content,
      rng: mulberry32(1),
    })
    expect(restored.progressSnapshot().quests.every((q) => q.state === 'available')).toBe(true)
  })
})
