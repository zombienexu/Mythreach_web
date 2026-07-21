import { describe, expect, it } from 'vitest'
// Vite's `?raw` loads the file as a string — no node:fs, no node types needed.
import arena from '../src/ui/slice/views/ArenaView.svelte?raw'
import codex from '../src/ui/slice/views/CodexView.svelte?raw'
import dossier from '../src/ui/slice/views/DossierView.svelte?raw'
import field from '../src/ui/components/FieldScreen.svelte?raw'
import talents from '../src/ui/slice/views/TalentsView.svelte?raw'
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

  it('the slice has exactly five destinations', () => {
    expect(game).toContain("export type View = 'arena' | 'map' | 'talents' | 'dossier' | 'codex'")
  })
})

describe('dossier + codex speak the new systems', () => {
  it('dossier drives Standing, loadout, and Charges', () => {
    expect(dossier).toContain('ex.tier.name')
    expect(dossier).toContain('acceptQuest')
    expect(dossier).toContain('game.equip')
    // the Grace ladder moved to Talents, where the workings are taken up
    expect(dossier).not.toContain('GRACE_TIERS')
  })

  it('codex transmits findings home', () => {
    expect(codex).toContain('game.transmit')
    expect(codex).toContain('recovery')
  })
})

describe('the staff is the player\'s to swing', () => {
  it('the arena hands the wind-up and the press to the bar', () => {
    const s = squish(arena)
    expect(s).toContain('strike={game.combat.player.strike}')
    expect(s).toContain('onstrike={()=>game.strike()}')
  })

  it('Q is bound to the strike, and nothing swings on its own', () => {
    expect(squish(game)).toContain("e.key==='q'")
    expect(game).toContain('this.sim.strike()')
  })
})

describe('new workings are learned at leisure, never mid-swing', () => {
  it('the talents screen is where an offer is taken up', () => {
    expect(talents).toContain('GRACE_TIERS')
    expect(talents).toContain('game.learn(')
    expect(talents).toContain('game.pendingLearns')
  })

  it('a tier-up raises a quiet offer, not a modal', () => {
    expect(game).toContain('this.expedition.justOffered')
    expect(game).toContain('this.expedition.learn(id)')
  })
})

describe('the field is scattered ground, not a row of cards', () => {
  it('sightings are placed in field coordinates, one card per body', () => {
    const s = squish(field)
    expect(s).toContain('left="{o.x*100}%"')
    expect(s).toContain('top="{o.y*100}%"')
    expect(s).toContain('onmark(o.id,k)')
  })

  it('the aggro geometry is invisible — the field teaches proximity by pulling', () => {
    expect(field).not.toContain('AGGRO_RADIUS')
    expect(field).not.toContain('clusterOf')
    expect(field).not.toContain('wires')
  })

  it('engaging pulls the whole cluster, and Space walks on', () => {
    expect(game).toContain('clusterSpec(this.field, id)')
    expect(game).toContain('nextScreen()')
  })

  it('the fight opens by attacking the marked body, not by a commit key', () => {
    const s = squish(game)
    expect(s).toContain('this.engageMarkedMob()')
    // Tab walks bodies out in the field; Enter no longer commits to anything
    expect(s).toContain('this.cycleMob()')
    // Enter still only acknowledges a ceremony — it commits to nothing
    expect(game).not.toContain('engageSelectedOffer')
  })
})
