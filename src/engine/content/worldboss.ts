import type { EnemyDef } from '../types'

/** "The Rift Colossus" — the async world-boss scaffold. It fights as an ordinary
 *  boss-rank enemy, but its HP is a persistent pool in the save (the one field a
 *  server would someday own) rather than resetting each spawn. */
export const WORLD_BOSS: EnemyDef = {
  id: 'rift-colossus',
  name: 'The Rift Colossus',
  intro: 'A wound in the sky takes a shape, and the shape notices you.',
  level: 15,
  rank: 'boss',
  hp: 40_000,
  swingTicks: 30,
  dmgMin: 8,
  dmgMax: 14,
  xp: 0,
  goldMin: 0,
  goldMax: 0,
  dropPct: 0,
  portrait: { family: 'titan', hue: 305 },
  mechanics: [
    { kind: 'hardcast', name: 'Riftquake', castTicks: 60, cooldownTicks: 240, dmgMin: 20, dmgMax: 28 },
  ],
}

/** The full pool the colossus resets to when felled. */
export const WORLD_BOSS_MAX_HP = WORLD_BOSS.hp
