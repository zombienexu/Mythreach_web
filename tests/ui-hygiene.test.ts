import { describe, expect, it } from 'vitest'
// Vite's `?raw` loads the file as a string — no node:fs, no node types needed.
import arena from '../src/ui/slice/views/ArenaView.svelte?raw'
import codex from '../src/ui/slice/views/CodexView.svelte?raw'
import dossier from '../src/ui/slice/views/DossierView.svelte?raw'
import game from '../src/ui/game.svelte.ts?raw'

/** Collapse whitespace so token matches survive reformatting. */
function squish(s: string): string {
  return s.replace(/\s+/g, '')
}

describe('arena — combat staged, wheel fed by teaching', () => {
  it('the action wheel shows only what the world has taught', () => {
    // Grace-gated teaching: the wheel's `unlocked` prop is the taught set, not
    // the level-unlocked set. This is the whole point of the slice.
    expect(squish(arena)).toContain('unlocked={game.taught}')
  })

  it('still lays out formation ranks', () => {
    const s = squish(arena)
    expect(s).toContain("row==='back'")
    expect(s).toContain("row!=='back'")
  })

  it('the world-boss / assault surfaces are stripped from the slice', () => {
    for (const token of ['assault', 'retreat', 'worldBoss', 'Colossus']) {
      expect(arena).not.toContain(token)
    }
  })
})

describe('the meta loop is wired into the event drain', () => {
  it('game folds every event through the expedition', () => {
    expect(game).toContain('this.expedition.observe(event)')
    // teaching re-arms the sim's gate on a Grace tier-up
    expect(game).toContain('this.expedition.applyTo(this.sim)')
  })

  it('the slice has exactly four destinations', () => {
    expect(game).toContain("export type View = 'arena' | 'map' | 'dossier' | 'codex'")
  })
})

describe('dossier + codex speak the new systems', () => {
  it('dossier drives Standing, teaching, loadout, and Charges', () => {
    expect(dossier).toContain('GRACE_TIERS')
    expect(dossier).toContain('acceptQuest')
    expect(dossier).toContain('game.equip')
  })

  it('codex transmits findings home', () => {
    expect(codex).toContain('game.transmit')
    expect(codex).toContain('recovery')
  })
})
