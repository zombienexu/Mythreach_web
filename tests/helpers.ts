import { CombatEngine } from '../src/engine/engine'
import { DEFAULT_CONFIG, type EncounterConfig } from '../src/engine/types'
import type { CombatEvent } from '../src/engine/events'
import { mulberry32 } from '../src/engine/rng'

export function makeEngine(overrides: Partial<EncounterConfig> = {}, seed = 1): CombatEngine {
  return new CombatEngine({ ...DEFAULT_CONFIG, ...overrides }, mulberry32(seed))
}

/** Advance `ticks` ticks, collecting every event emitted along the way. */
export function advance(engine: CombatEngine, ticks: number): CombatEvent[] {
  const out: CombatEvent[] = []
  for (let i = 0; i < ticks; i++) out.push(...engine.tick())
  return out
}

/** Advance one tick at a time, recording which tick number each event landed on. */
export function advanceTimeline(
  engine: CombatEngine,
  ticks: number,
): Array<{ tick: number; events: CombatEvent[] }> {
  const out: Array<{ tick: number; events: CombatEvent[] }> = []
  for (let i = 0; i < ticks; i++) {
    const events = engine.tick()
    if (events.length > 0) out.push({ tick: engine.snapshot().tick, events })
  }
  return out
}

export function eventsOf<K extends CombatEvent['kind']>(
  events: CombatEvent[],
  kind: K,
): Extract<CombatEvent, { kind: K }>[] {
  return events.filter((e): e is Extract<CombatEvent, { kind: K }> => e.kind === kind)
}
