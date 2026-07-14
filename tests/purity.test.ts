import { describe, expect, it } from 'vitest'

/** Every `.ts` file under src/engine, read as raw text via Vite's glob import
 *  (no `node:fs`, so this compiles under the app tsconfig too). The engine is a
 *  pure, synchronous, integer-tick simulation: no wall clock, no ambient
 *  randomness, no browser globals, and no reach into the UI world. These tests
 *  turn that contract into a build failure the moment it is broken. */
const SOURCES = import.meta.glob('../src/engine/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const entries = Object.entries(SOURCES)

describe('engine purity', () => {
  it('engine sources are free of ambient globals', () => {
    expect(entries.length).toBeGreaterThan(0)
    const AMBIENT =
      /\b(window|document|localStorage|sessionStorage|navigator|requestAnimationFrame|setTimeout|setInterval|performance|fetch|console)\b/
    const offenders: string[] = []
    for (const [path, text] of entries) {
      if (AMBIENT.test(text)) offenders.push(`${path}: ambient global`)
      if (/\bDate\.now\b/.test(text)) offenders.push(`${path}: Date.now`)
      if (/\bnew Date\b/.test(text)) offenders.push(`${path}: new Date`)
      if (/\bMath\.random\b/.test(text)) offenders.push(`${path}: Math.random`)
    }
    expect(offenders).toEqual([])
  })

  it('engine sources import nothing from the UI world', () => {
    const offenders: string[] = []
    const importRe = /\bimport\b[^'"]*['"]([^'"]+)['"]/g
    for (const [path, text] of entries) {
      for (const m of text.matchAll(importRe)) {
        const spec = m[1] ?? ''
        if (
          spec.includes('svelte') ||
          spec.includes('../ui') ||
          spec.endsWith('.svelte') ||
          spec === 'pixi' ||
          spec.startsWith('pixi') ||
          spec === 'gsap'
        ) {
          offenders.push(`${path}: imports ${spec}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
