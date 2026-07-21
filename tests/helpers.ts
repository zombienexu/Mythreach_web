import type { CombatEvent } from '../src/engine/events'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type {
  ContentPack,
  EncounterDef,
  EnemyDef,
  EnemySnapshot,
  HeroIdentity,
  MaterialDef,
  QuestDef,
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
  extra: { enemies?: EnemyDef[]; region1Encounters?: EncounterDef[]; quests?: QuestDef[] } = {},
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
    quests: extra.quests ?? [],
  }
}

export function blankSave(over: Partial<SaveData> = {}): SaveData {
  return {
    version: 5,
    level: 1,
    xp: 0,
    gold: 0,
    classId: 'arcanist',
    originId: '',
    signId: '',
    talents: {},
    equipped: {},
    inventory: [],
    nextUid: 1,
    regionId: 'r1',
    materials: {},
    activeQuests: {},
    completedQuests: [],
    achievements: [],
    lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
    records: { worldBossFells: 0, bestAssaultDamage: 0 },
    worldBossHp: 40_000,
    companionId: null,
    ledgerPages: 0,
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
  identity?: HeroIdentity
}

/** A sim on test content, optionally pre-leveled via the save path. */
export function makeSim(opts: MakeSimOptions = {}): GameSim {
  const content = opts.content ?? testContent()
  const rng = mulberry32(opts.seed ?? 1)
  if (opts.level !== undefined || opts.save !== undefined) {
    const identityFields: Partial<SaveData> = opts.identity
      ? { classId: opts.identity.classId, originId: opts.identity.originId, signId: opts.identity.signId }
      : {}
    return GameSim.deserialize(blankSave({ level: opts.level ?? 1, ...identityFields, ...opts.save }), {
      content,
      rng,
    })
  }
  return new GameSim({ content, rng, ...(opts.identity ? { identity: opts.identity } : {}) })
}

/** Put the next pack on the field: sweeps a pending loot screen, starts a
 *  fight from idle (waiting out a respawn if the hero is down), then ticks
 *  until the mobs are live. Returns every event seen along the way.
 *
 *  A freshly-spawned pack now stands dormant (see the aggro mechanic) — the
 *  player gets a free first strike before the field wakes. By default this
 *  rouses the pack the instant it spawns, so downstream tests observe a live,
 *  attacking fight exactly as they did before dormancy existed. Pass
 *  `{ engage: false }` to leave the pack dormant and observe the grace itself. */
export function advanceToSpawn(sim: GameSim, opts: { engage?: boolean } = {}): CombatEvent[] {
  const engage = opts.engage ?? true
  const events: CombatEvent[] = []
  for (let i = 0; i < 400; i++) {
    const snap = sim.combatSnapshot()
    if (snap.phase === 'looting') sim.collectAllLoot()
    else if (snap.phase === 'idle' && snap.player.alive) sim.startFight()
    // Rouse before the spawn tick's enemy phase runs, so swing/venom/cast
    // cadences count from the spawn tick exactly as they did pre-dormancy.
    if (engage) sim.provoke()
    events.push(...sim.tick())
    if (sim.combatSnapshot().enemies.length > 0) return events
  }
  throw new Error('no enemy spawned within 400 ticks')
}

/** Play whole fights — start, fireball everything down, loot — until `stop()`
 *  turns true or the tick budget runs out. */
export function huntUntil(sim: GameSim, stop: () => boolean, budget = 8000): CombatEvent[] {
  const events: CombatEvent[] = []
  for (let i = 0; i < budget; i++) {
    if (stop()) return events
    const snap = sim.combatSnapshot()
    if (snap.phase === 'looting') sim.collectAllLoot()
    else if (snap.phase === 'idle' && snap.player.alive) sim.startFight()
    else if (snap.enemies.length > 0 && snap.cast === null && snap.queued === null) {
      sim.useAbility('fireball')
    }
    events.push(...sim.tick())
  }
  if (!stop()) throw new Error(`huntUntil: condition not met within ${budget} ticks`)
  return events
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
