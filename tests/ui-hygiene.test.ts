import { describe, expect, it } from 'vitest'
// Vite's `?raw` loads the file as a string — no node:fs, no node types needed.
import combat from '../src/ui/views/CombatView.svelte?raw'
import game from '../src/ui/game.svelte.ts?raw'
import regions from '../src/ui/views/AtlasView.svelte?raw'
import character from '../src/ui/views/CharacterView.svelte?raw'

/** Collapse whitespace so token matches survive reformatting. */
function squish(s: string): string {
  return s.replace(/\s+/g, '')
}

describe('combat screen — log removed, formation added', () => {
  it('the combat log is gone', () => {
    expect(combat).not.toContain('CombatLog')
    expect(combat).not.toContain('chronicle')
    expect(game).not.toContain('private append')
    expect(game).not.toMatch(/^\s*log:/m)
  })

  it('the combat view lays out formation ranks', () => {
    const s = squish(combat)
    expect(s).toContain("row==='back'")
    expect(s).toContain("row!=='back'")
  })

  it('expedition UI is removed from combat', () => {
    for (const token of ['TrailRibbon', 'embark', 'shrine', 'Blessing']) {
      expect(combat).not.toContain(token)
    }
  })
})

describe('regions screen', () => {
  it('is wired to enterRegion over progress.regions', () => {
    expect(regions).toContain('enterRegion')
    expect(regions).toContain('progress.regions')
    for (const token of ['unlocked', 'locked', '>Travel<']) {
      expect(regions).not.toContain(token)
    }
  })
})

describe('character screen', () => {
  it('shows and sells materials', () => {
    expect(character).toContain('progress.materials')
    expect(character).toContain('sellMaterial')
  })
})
