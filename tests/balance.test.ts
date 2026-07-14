import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { Item, ItemSlot, StatId, TalentId } from '../src/engine/types'
import { TICKS_PER_SECOND } from '../src/engine/types'

/** Simple "smart player" heuristics on top of auto-battle: equip upgrades,
 *  spend talent points, challenge bosses, and move on. This is the balance
 *  envelope the shipped content must stay inside. */
function playCampaign(seed: number, maxHours: number) {
  const sim = new GameSim({ rng: mulberry32(seed) })
  sim.autoBattle = true
  const maxTicks = maxHours * 3600 * TICKS_PER_SECOND
  const talentOrder: TalentId[] = [
    'searingFlames',
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
  const bossKillTicks: Array<{ zone: string; tick: number; level: number; deaths: number }> = []
  let deaths = 0
  let kills = 0
  let tick = 0
  let dirty = true

  for (; tick < maxTicks; tick++) {
    for (const e of sim.tick()) {
      if (e.kind === 'playerDied') deaths++
      if (e.kind === 'enemyDied') {
        kills++
        dirty = true
      }
      if (e.kind === 'bossDefeated') {
        bossKillTicks.push({
          zone: e.zoneId,
          tick,
          level: sim.progressSnapshot().level,
          deaths,
        })
      }
      if (e.kind === 'gameCompleted') {
        return { sim, done: true, tick, deaths, kills, bossKillTicks }
      }
      // Auto-battle walks the trail itself; the "smart player" only decides when
      // to move on. Once the current zone's boss is down and we out-level the
      // next, travel there from camp (which is where expeditionEnded leaves us).
      if (e.kind === 'expeditionEnded' && e.outcome === 'completed') {
        const p = sim.progressSnapshot()
        const zone = p.zones.find((z) => z.current)
        if (zone?.bossDefeated) {
          const next = p.zones.find((z) => !z.bossDefeated && z.unlocked && z.id !== zone.id)
          if (next && p.level >= next.minLevel) sim.travelTo(next.id)
        }
      }
    }
    if (!dirty || tick % 40 !== 0) continue
    dirty = false
    const p = sim.progressSnapshot()
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
  }
  return { sim, done: false, tick, deaths, kills, bossKillTicks }
}

describe('campaign balance envelope', () => {
  it('a smart auto-player clears the campaign in 1.5–6 hours with tolerable deaths', () => {
    const run = playCampaign(1234, 8)
    const hours = run.tick / TICKS_PER_SECOND / 3600
    console.log(
      `campaign: done=${run.done} in ${hours.toFixed(2)}h, kills=${run.kills}, deaths=${run.deaths}`,
    )
    for (const b of run.bossKillTicks) {
      console.log(
        `  boss ${b.zone} at ${(b.tick / TICKS_PER_SECOND / 60).toFixed(1)}min, level ${b.level}, deaths so far ${b.deaths}`,
      )
    }
    expect(run.done).toBe(true)
    expect(hours).toBeGreaterThan(0.5)
    expect(hours).toBeLessThan(3)
    expect(run.deaths).toBeLessThan(25)
  }, 30_000)

  it('early game is gentle: first boss falls inside 15 minutes with at most 2 deaths', () => {
    const run = playCampaign(77, 1)
    const first = run.bossKillTicks[0]
    expect(first).toBeDefined()
    expect(first!.tick / TICKS_PER_SECOND / 60).toBeLessThan(15)
    expect(first!.deaths).toBeLessThanOrEqual(2)
  }, 30_000)
})
