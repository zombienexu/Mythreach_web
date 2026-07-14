import { MS_PER_TICK } from '../engine'

/** Max simulated time per frame — a hidden tab resumes with at most 5 ticks of
 *  catch-up. Your absence must not progress the game: the world simply waits,
 *  so a long background gap is discarded here rather than fast-forwarded. */
const MAX_FRAME_MS = 250

export interface LoopHandle {
  stop(): void
}

/** requestAnimationFrame + accumulator: runs `stepTick` once per elapsed
 *  50 ms tick, then `afterTicks(n)` once per frame with the tick count. */
export function startLoop(stepTick: () => void, afterTicks: (ran: number) => void): LoopHandle {
  let last = performance.now()
  let acc = 0
  let raf = 0

  const frame = (now: number) => {
    acc += Math.min(now - last, MAX_FRAME_MS)
    last = now
    let ran = 0
    while (acc >= MS_PER_TICK) {
      acc -= MS_PER_TICK
      stepTick()
      ran++
    }
    afterTicks(ran)
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return { stop: () => cancelAnimationFrame(raf) }
}
