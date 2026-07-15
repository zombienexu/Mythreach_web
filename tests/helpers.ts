import type { CombatEvent } from '../src/engine/events'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type {
  ContentPack,
  EncounterDef,
  EnemyDef,
  EnemySnapshot,
  MaterialDef,
  RegionDef,
  SaveData,
} from '../src/engine/types'

/** A fully controllable enemy. Defaults to a harmless, drop-less training dummy. */
export function dummyEnemy(over: Partial<EnemyDef> = {}): EnemyDef {
  return {
    id: 'dummy',
    name: 'Training Dummy',
    intro: 'A Training Dummy creaks into place.',
    level: 1,
    rank: 'normal',
    hp: 1000,
    swingTicks: 10_000,
    dmgMin: 0,
    dmgMax: 0,
    xp: 10,
    goldMin: 1,
    goldMax: 1,
    dropPct: 0,
    portrait: { family: 'golem', hue: 0 },
    mechanics: [],
    ...over,
  }
}

/** Two-region content pack: r1 (dummy, low) and r2 (dummy2, medium). Both are
 *  freely selectable — regions are never gated. */
export function testContent(
  enemyOverrides: Partial<EnemyDef> = {},
  extra: { enemies?: EnemyDef[]; region1Encounters?: EncounterDef[] } = {},
): ContentPack {
  const enemies: EnemyDef[] = [
    dummyEnemy(enemyOverrides),
    dummyEnemy({ id: 'dummy2', name: 'Second Dummy', level: 5, xp: 20 }),
    ...(extra.enemies ?? []),
  ]
  const materials: MaterialDef[] = [
    { id: 'test-scrap', name: 'Test Scrap', tier: 'low', value: 5, flavor: 'test junk' },
    { id: 'test-relic', name: 'Test Relic', tier: 'medium', value: 12, flavor: 'test relic' },
  ]
  const regions: RegionDef[] = [
    {
      id: 'r1',
      name: 'Region One',
      epithet: 'test grounds',
      tier: 'low',
      minLevel: 1,
      maxLevel: 6,
      hue: 200,
      encounters: extra.region1Encounters ?? [{ slots: [{ enemyId: 'dummy' }], weight: 1 }],
      // Mirror the normal table so the ~12% elite roll spawns the same pack —
      // keeps encounter tests deterministic.
      eliteEncounters: extra.region1Encounters ?? [{ slots: [{ enemyId: 'dummy' }], weight: 1 }],
      materials: ['test-scrap'],
      intro: 'region one',
    },
    {
      id: 'r2',
      name: 'Region Two',
      epithet: 'more test grounds',
      tier: 'medium',
      minLevel: 7,
      maxLevel: 12,
      hue: 100,
      encounters: [{ slots: [{ enemyId: 'dummy2' }], weight: 1 }],
      eliteEncounters: [{ slots: [{ enemyId: 'dummy2' }], weight: 1 }],
      materials: ['test-relic'],
      intro: 'region two',
    },
  ]
  return {
    regions,
    enemies: Object.fromEntries(enemies.map((e) => [e.id, e])),
    materials: Object.fromEntries(materials.map((m) => [m.id, m])),
  }
}

export function blankSave(over: Partial<SaveData> = {}): SaveData {
  return {
    version: 3,
    level: 1,
    xp: 0,
    gold: 0,
    talents: {},
    equipped: {},
    inventory: [],
    nextUid: 1,
    regionId: 'r1',
    materials: {},
    achievements: [],
    lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
    records: { worldBossFells: 0, bestAssaultDamage: 0 },
    worldBossHp: 40_000,
    companionId: null,
    autoBattle: false,
    ...over,
  }
}

/** A v1-shaped save blob, complete with the fields v2 dropped (savedAt, muted,
 *  zoneKills). Typed loosely — the whole point is the shape predates SaveData. */
export function v1Save(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    savedAt: 1_700_000_000_000,
    level: 1,
    xp: 0,
    gold: 0,
    talents: {},
    equipped: {},
    inventory: [],
    nextUid: 1,
    zoneId: 'z1',
    zoneKills: {},
    bossesDefeated: [],
    achievements: [],
    lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
    autoBattle: false,
    muted: false,
    completed: false,
    ...over,
  }
}

export interface MakeSimOptions {
  seed?: number
  level?: number
  content?: ContentPack
  save?: Partial<SaveData>
}

/** A sim on test content, optionally pre-leveled via the save path. */
export function makeSim(opts: MakeSimOptions = {}): GameSim {
  const content = opts.content ?? testContent()
  const rng = mulberry32(opts.seed ?? 1)
  if (opts.level !== undefined || opts.save !== undefined) {
    return GameSim.deserialize(blankSave({ level: opts.level ?? 1, ...opts.save }), { content, rng })
  }
  return new GameSim({ content, rng })
}

/** Advance until the next pack is on the field. Combat is endless: a spawn is
 *  always scheduled, so this always lands on a fight. */
export function advanceToSpawn(sim: GameSim): CombatEvent[] {
  const events: CombatEvent[] = []
  for (let i = 0; i < 400; i++) {
    events.push(...sim.tick())
    if (sim.combatSnapshot().enemies.length > 0) return events
  }
  throw new Error('no enemy spawned within 400 ticks')
}

/** The player's current target, or null — the multi-enemy stand-in for the
 *  old single `snapshot().enemy`. */
export function targetOf(sim: GameSim): EnemySnapshot | null {
  const snap = sim.combatSnapshot()
  return snap.enemies.find((e) => e.iid === snap.target) ?? null
}

/** Advance `ticks` ticks, collecting every event emitted along the way. */
export function advance(sim: GameSim, ticks: number): CombatEvent[] {
  const out: CombatEvent[] = []
  for (let i = 0; i < ticks; i++) out.push(...sim.tick())
  return out
}

/** Advance one tick at a time, recording which tick number each event landed on. */
export function advanceTimeline(
  sim: GameSim,
  ticks: number,
): Array<{ tick: number; events: CombatEvent[] }> {
  const out: Array<{ tick: number; events: CombatEvent[] }> = []
  for (let i = 0; i < ticks; i++) {
    const events = sim.tick()
    if (events.length > 0) out.push({ tick: sim.combatSnapshot().tick, events })
  }
  return out
}

export function eventsOf<K extends CombatEvent['kind']>(
  events: CombatEvent[],
  kind: K,
): Extract<CombatEvent, { kind: K }>[] {
  return events.filter((e): e is Extract<CombatEvent, { kind: K }> => e.kind === kind)
}
