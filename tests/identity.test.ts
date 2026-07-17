import { describe, expect, it } from 'vitest'
import {
  CLASSES,
  CLASS_BY_ID,
  ORIGINS,
  SIGNS,
  forgeName,
  validName,
} from '../src/ui/content/identity'

describe('callings', () => {
  it('ids are unique and the lookup table agrees with the list', () => {
    const ids = CLASSES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CLASSES) expect(CLASS_BY_ID[c.id]).toBe(c)
  })

  it('the Arcanist is playable today; sealed callings exist to be coveted', () => {
    expect(CLASS_BY_ID.arcanist.playable).toBe(true)
    expect(CLASSES.some((c) => !c.playable)).toBe(true)
  })

  it('every calling is fully designed: lore, mechanic, three ability previews, a hue', () => {
    for (const c of CLASSES) {
      expect(c.lore.length, c.id).toBeGreaterThan(40)
      expect(c.mechanic.name.length, c.id).toBeGreaterThan(0)
      expect(c.mechanic.text.length, c.id).toBeGreaterThan(20)
      expect(c.abilities.length, c.id).toBe(3)
      for (const a of c.abilities) expect(a.blurb.length, `${c.id}/${a.name}`).toBeGreaterThan(0)
      expect(c.hue, c.id).toBeGreaterThanOrEqual(0)
      expect(c.hue, c.id).toBeLessThan(360)
    }
  })
})

describe('origins and signs', () => {
  it('origin ids are unique and each carries a promise', () => {
    const ids = ORIGINS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of ORIGINS) expect(o.promise).toContain('Will lean')
  })

  it('sign ids are unique and every constellation line joins real stars', () => {
    const ids = SIGNS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SIGNS) {
      expect(s.stars.length, s.id).toBeGreaterThanOrEqual(4)
      for (const [a, b] of s.lines) {
        expect(a, s.id).toBeLessThan(s.stars.length)
        expect(b, s.id).toBeLessThan(s.stars.length)
      }
      for (const [x, y] of s.stars) {
        expect(x, s.id).toBeGreaterThanOrEqual(0)
        expect(x, s.id).toBeLessThanOrEqual(100)
        expect(y, s.id).toBeGreaterThanOrEqual(0)
        expect(y, s.id).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('the name forge', () => {
  it('is deterministic under a held quill', () => {
    let i = 0
    const seq = [0.1, 0.7, 0.4, 0.9]
    const rng = () => seq[i++ % seq.length] ?? 0
    const a = forgeName(rng)
    i = 0
    const b = forgeName(rng)
    expect(a).toBe(b)
  })

  it('always forges a valid, capitalized name', () => {
    for (let n = 0; n < 200; n++) {
      const name = forgeName()
      expect(validName(name), name).toBe(true)
      expect(name.charAt(0), name).toBe(name.charAt(0).toUpperCase())
    }
  })

  it('validName trims and holds the 2–16 line', () => {
    expect(validName('  Al  ')).toBe(true)
    expect(validName('A')).toBe(false)
    expect(validName('')).toBe(false)
    expect(validName('Seventeenletters!')).toBe(false)
    expect(validName('Sixteenletters!!')).toBe(true)
  })
})
