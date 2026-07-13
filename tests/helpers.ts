import type { CombatEvent } from '../src/engine/events'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { ContentPack, EnemyDef, SaveData, ZoneDef } from '../src/engine/types'

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

/** Two-zone content pack: z1 (dummy → boss1) unlocks z2 (dummy2 → boss2 = final). */
export function testContent(
  enemyOverrides: Partial<EnemyDef> = {},
  extra: { enemies?: EnemyDef[]; zone1Spawns?: Array<{ enemyId: string; weight: number }> } = {},
): ContentPack {
  const enemies: EnemyDef[] = [
    dummyEnemy(enemyOverrides),
    dummyEnemy({ id: 'dummy2', name: 'Second Dummy', level: 5, xp: 20 }),
    dummyEnemy({ id: 'boss1', name: 'First Boss', rank: 'boss', hp: 300, xp: 100, dropPct: 100 }),
    dummyEnemy({ id: 'boss2', name: 'Final Boss', rank: 'boss', hp: 300, xp: 200, dropPct: 100 }),
    ...(extra.enemies ?? []),
  ]
  const zones: ZoneDef[] = [
    {
      id: 'z1',
      name: 'Zone One',
      epithet: 'test grounds',
      minLevel: 1,
      hue: 200,
      spawns: extra.zone1Spawns ?? [{ enemyId: 'dummy', weight: 1 }],
      bossId: 'boss1',
      intro: 'zone one',
    },
    {
      id: 'z2',
      name: 'Zone Two',
      epithet: 'more test grounds',
      minLevel: 5,
      hue: 100,
      spawns: [{ enemyId: 'dummy2', weight: 1 }],
      bossId: 'boss2',
      intro: 'zone two',
    },
  ]
  return { zones, enemies: Object.fromEntries(enemies.map((e) => [e.id, e])), finalBossId: 'boss2' }
}

export function blankSave(over: Partial<SaveData> = {}): SaveData {
  return {
    version: 1,
    savedAt: 0,
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

/** Advance until the first enemy is on the field (spawn happens at tick 20). */
export function advanceToSpawn(sim: GameSim): CombatEvent[] {
  const events: CombatEvent[] = []
  for (let i = 0; i < 200; i++) {
    events.push(...sim.tick())
    if (sim.combatSnapshot().enemy !== null) return events
  }
  throw new Error('no enemy spawned within 200 ticks')
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
