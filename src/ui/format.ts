import { TICKS_PER_SECOND } from '../engine'

/** "2.4" — seconds with one decimal, for countdowns. */
export function ticksToSeconds(ticks: number): string {
  return (Math.max(0, ticks) / TICKS_PER_SECOND).toFixed(1)
}
