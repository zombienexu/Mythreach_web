import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { QUEST_BY_ID } from '../src/engine/content/quests'
import type { Storagelike } from '../src/ui/persistence'
import { expeditionKeyFor } from '../src/ui/profile'
import {
  CAMP_DUELS,
  GRADUATION_BONUS,
  PROVING_BONUS,
  PROVING_DUELS,
  bonusForStep,
  currentDuel,
  inCamp,
} from '../src/ui/slice/camp'
import { FIRST_ORDER, GRACE_TIERS, standingForKill, taughtFor } from '../src/ui/slice/content'
import { Expedition } from '../src/ui/slice/expedition.svelte'
import { advance, advanceToSpawn, eventsOf, makeSim, testContent } from './helpers'

function fakeStorage(seed: Record<string, string> = {}): Storagelike {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('the Kindle Yard script', () => {
  it('is five duels — a three-bout proving, then a two-bout tempering', () => {
    expect(CAMP_DUELS).toHaveLength(5)
    expect(PROVING_DUELS).toBe(3)
    for (const duel of CAMP_DUELS) {
      expect(ENEMIES[duel.opponentId], duel.opponentId).toBeDefined()
      expect(duel.brief.length).toBeGreaterThan(0)
      expect(duel.lesson.length).toBeGreaterThan(0)
    }
  })

  it('sparring partners pay no coin and drop nothing — XP and Standing only', () => {
    for (const duel of CAMP_DUELS) {
      const def = ENEMIES[duel.opponentId]!
      expect(def.goldMax).toBe(0)
      expect(def.dropPct).toBe(0)
      expect(def.xp).toBeGreaterThan(0)
    }
  })

  it('walks the script: currentDuel, inCamp, and the boundary bonuses', () => {
    expect(currentDuel(0)).toBe(CAMP_DUELS[0])
    expect(currentDuel(CAMP_DUELS.length)).toBeNull()
    expect(inCamp(0)).toBe(true)
    expect(inCamp(CAMP_DUELS.length)).toBe(false)
    expect(bonusForStep(PROVING_DUELS)).toBe(PROVING_BONUS)
    expect(bonusForStep(CAMP_DUELS.length)).toBe(GRADUATION_BONUS)
    expect(bonusForStep(1)).toBe(0)
  })

  it('the standing arithmetic lands Fireball exactly at the proving', () => {
    // A recruit is taught nothing. Three duel kills + the proving bonus cross
    // Blooded — the First Weaving — and nothing further.
    expect(GRACE_TIERS[0]!.teaches).toHaveLength(0)
    const afterProving = PROVING_DUELS * standingForKill('normal') + PROVING_BONUS
    expect(afterProving).toBeGreaterThanOrEqual(GRACE_TIERS[1]!.at)
    expect(afterProving).toBeLessThan(GRACE_TIERS[2]!.at)
    expect(taughtFor(afterProving)).toEqual(['fireball'])
    // The whole camp plus the boar order lands Detonate right after the yard:
    // 5 duels + both bonuses + 6 boars + the turn-in crosses Hardened.
    const graduation = CAMP_DUELS.length * standingForKill('normal') + PROVING_BONUS + GRADUATION_BONUS
    expect(graduation).toBeLessThan(GRACE_TIERS[2]!.at)
    const afterBoars = graduation + 6 * standingForKill('normal') + 45
    expect(afterBoars).toBeGreaterThanOrEqual(GRACE_TIERS[2]!.at)
  })

  it('the first order is the boar quest, and it hunts a real Hollowroot boar', () => {
    const quest = QUEST_BY_ID[FIRST_ORDER]
    expect(quest).toBeDefined()
    expect(quest!.objective).toEqual({ kind: 'kill', enemyId: 'mossback-boar', count: 6 })
    expect(quest!.regionId).toBe('hollowroot')
  })
})

describe('the expedition runs the camp', () => {
  it('advanceCamp walks to graduation and teaches Fireball at the proving', () => {
    const ex = new Expedition(fakeStorage())
    expect(ex.inCamp).toBe(true)
    // The three proving kills, as observe() would fold them in.
    for (let i = 0; i < PROVING_DUELS; i++) {
      ex.observe({ kind: 'enemyDied', iid: i, defId: 'trainee-pell', name: 'x', rank: 'normal' })
      const taught = ex.advanceCamp()
      if (i < PROVING_DUELS - 1) expect(taught).toBeNull()
      else expect(taught).toEqual(['fireball']) // the First Weaving
    }
    expect(ex.tier.name).toBe('Blooded')
    // The tempering, through to graduation.
    ex.advanceCamp()
    expect(ex.inCamp).toBe(true)
    ex.advanceCamp()
    expect(ex.inCamp).toBe(false)
    expect(ex.justGraduated).toBe(true)
    // Graduated is terminal: further advances are refused.
    expect(ex.advanceCamp()).toBeNull()
  })

  it('camp progress survives the save round-trip', () => {
    const storage = fakeStorage()
    const a = new Expedition(storage)
    a.advanceCamp()
    a.advanceCamp()
    const b = new Expedition(storage)
    expect(b.camp).toBe(2)
    expect(b.inCamp).toBe(true)
  })

  it('a pre-camp save (already briefed) migrates as graduated, Fireball intact', () => {
    const storage = fakeStorage({
      [expeditionKeyFor(1)]: JSON.stringify({ standing: 10, progress: {}, transmitted: [], briefed: true }),
    })
    const ex = new Expedition(storage)
    expect(ex.inCamp).toBe(false)
    // Standing floored at Blooded so the old recruit keeps their Fireball.
    expect(ex.standing).toBeGreaterThanOrEqual(GRACE_TIERS[1]!.at)
    expect(ex.taughtIds()).toContain('fireball')
  })

  it('a fresh expedition starts at the gate: camp step zero, nothing taught', () => {
    const ex = new Expedition(fakeStorage())
    expect(ex.camp).toBe(0)
    expect(ex.taughtIds()).toEqual([])
  })
})

describe('sparring in the engine', () => {
  const spar = () =>
    testContent(
      { hp: 40, swingTicks: 10_000 },
      {
        quests: [
          {
            id: 'q-test-dummies',
            name: 'Dummy Cull',
            giver: 'Nobody',
            text: 'x',
            regionId: 'r1',
            objective: { kind: 'kill', enemyId: 'dummy', count: 3 },
            reward: { xp: 10, gold: 10, gear: null },
          },
        ],
      },
    )

  it('a sparring win pays XP but banks no loot and clears the field itself', () => {
    const sim = makeSim({ content: spar() })
    expect(sim.startFight({ enemyIds: ['dummy'], sparring: true, engaged: true })).toBe(true)
    const events = advance(sim, 400)
    expect(eventsOf(events, 'enemyDied')).toHaveLength(1)
    expect(eventsOf(events, 'xpGained').length).toBeGreaterThan(0)
    expect(eventsOf(events, 'goldGained')).toHaveLength(0)
    expect(eventsOf(events, 'lootDropped')).toHaveLength(0)
    expect(eventsOf(events, 'materialDropped')).toHaveLength(0)
    // No loot screen between comrades: the field settles straight to idle.
    expect(sim.combatSnapshot().phase).toBe('idle')
    expect(sim.combatSnapshot().enemies).toHaveLength(0)
  })

  it('a sparring kill hunts nobody\'s quarry — kill-quests do not advance', () => {
    const sim = makeSim({ content: spar() })
    expect(sim.acceptQuest('q-test-dummies')).toBe(true)
    sim.startFight({ enemyIds: ['dummy'], sparring: true, engaged: true })
    advance(sim, 400)
    const quest = sim.progressSnapshot().quests.find((q) => q.id === 'q-test-dummies')
    expect(quest?.objective.progress).toBe(0)
    // A real fight against the same foe still counts.
    advanceToSpawn(sim)
    advance(sim, 400)
    const after = sim.progressSnapshot().quests.find((q) => q.id === 'q-test-dummies')
    expect(after?.objective.progress ?? 0).toBeGreaterThan(0)
  })
})
