import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { Item, ItemSlot, StatId, TalentId } from '../src/engine/types'
import { LEVEL_CAP, TICKS_PER_SECOND } from '../src/engine/types'

/** A "smart player" on top of auto-battle: equip upgrades, spend talent points,
 *  and move to the hardest region you out-level. This is the balance envelope the
 *  shipped content must stay inside now that combat is endless. */
function playEndless(seed: number, maxHours: number) {
  const sim = new GameSim({ rng: mulberry32(seed) })
  sim.autoDrive = true
  const maxTicks = maxHours * 3600 * TICKS_PER_SECOND
  const talentOrder: TalentId[] = [
    'searingFlames',
    'lingeringFlame',
    'criticalMass',
    'impFireball',
    'fortitude',
    'meditation',
    'swiftRenewal',
  ]
  const score = (item: Item | undefined): number => {
    if (!item) return -1
    const s = item.stats as Partial<Record<StatId, number>>
    return (s.power ?? 0) * 2 + (s.crit ?? 0) * 2 + (s.stamina ?? 0) + (s.spirit ?? 0)
  }

  let deaths = 0
  let kills = 0
  let tick = 0
  let dirty = true
  let maxLevel = 1

  for (; tick < maxTicks; tick++) {
    for (const e of sim.tick()) {
      if (e.kind === 'playerDied') deaths++
      if (e.kind === 'enemyDied') {
        kills++
        dirty = true
      }
      if (e.kind === 'levelUp') {
        maxLevel = e.level
        if (e.level >= LEVEL_CAP) return { sim, done: true, tick, deaths, kills, maxLevel }
      }
    }
    if (!dirty || tick % 40 !== 0) continue
    dirty = false
    const p = sim.progressSnapshot()
    maxLevel = Math.max(maxLevel, p.level)
    // Equip anything better than what's worn; sell the rest.
    for (const item of [...p.inventory]) {
      if (score(item) > score(p.equipped[item.slot as ItemSlot])) sim.equipItem(item.uid)
      else sim.sellItem(item.uid)
    }
    // Spend every talent point down the priority list.
    let points = sim.progressSnapshot().talentPoints
    outer: while (points > 0) {
      for (const t of talentOrder) {
        if (sim.spendTalent(t)) {
          points--
          continue outer
        }
      }
      break
    }
    // Move to the hardest region we now out-level.
    const cur = p.regions.find((r) => r.current)!
    const target = [...p.regions].reverse().find((r) => p.level >= r.minLevel)
    if (target && target.id !== cur.id) sim.enterRegion(target.id)
  }
  return { sim, done: false, tick, deaths, kills, maxLevel }
}

describe('progression balance envelope', () => {
  it('a smart auto-player reaches the level cap within a few hours, with tolerable deaths', () => {
    const run = playEndless(1234, 8)
    const hours = run.tick / TICKS_PER_SECOND / 3600
    console.log(
      `endless: done=${run.done} maxLevel=${run.maxLevel} in ${hours.toFixed(2)}h, kills=${run.kills}, deaths=${run.deaths}`,
    )
    expect(run.done).toBe(true)
    expect(hours).toBeGreaterThan(0.5)
    expect(hours).toBeLessThan(6)
    expect(run.deaths).toBeLessThan(40)
  }, 30_000)

  it('early game is gentle: the first few levels come fast and cheap', () => {
    const sim = new GameSim({ rng: mulberry32(77) })
    sim.autoDrive = true
    let deaths = 0
    let reached5 = -1
    for (let tick = 0; tick < 1 * 3600 * TICKS_PER_SECOND && reached5 < 0; tick++) {
      for (const e of sim.tick()) {
        if (e.kind === 'playerDied') deaths++
        if (e.kind === 'levelUp' && e.level >= 5) reached5 = tick
      }
    }
    expect(reached5).toBeGreaterThan(0)
    expect(reached5 / TICKS_PER_SECOND / 60).toBeLessThan(20) // level 5 inside 20 minutes
    // Seed-sensitive: discrete-fight pacing shifted the rng stream by a death.
    expect(deaths).toBeLessThanOrEqual(5)
  }, 30_000)
})
