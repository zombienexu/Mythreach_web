import { TICKS_PER_SECOND } from '../engine'
import type { Rarity, StatId } from '../engine'

/** "2.4" — seconds with one decimal, for countdowns. */
export function ticksToSeconds(ticks: number): string {
  return (Math.max(0, ticks) / TICKS_PER_SECOND).toFixed(1)
}

/** "29" / "2.4" — how a game client counts a cooldown down: whole seconds
 *  until it is nearly up, then tenths, when tenths are what you're waiting on. */
export function cooldownLabel(ticks: number): string {
  const s = Math.max(0, ticks) / TICKS_PER_SECOND
  return s >= 3 ? String(Math.ceil(s)) : s.toFixed(1)
}

/** "12:04" — session clock for the combat log. */
export function ticksToClock(ticks: number): string {
  const total = Math.floor(Math.max(0, ticks) / TICKS_PER_SECOND)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** "6h 12m" / "43m" / "50s" — humane duration for the offline modal. */
export function ticksToDuration(ticks: number): string {
  const total = Math.floor(Math.max(0, ticks) / TICKS_PER_SECOND)
  if (total < 60) return `${total}s`
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export const STAT_LABEL: Record<StatId, string> = {
  power: 'Power',
  stamina: 'Stamina',
  spirit: 'Spirit',
  crit: 'Crit',
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
}
