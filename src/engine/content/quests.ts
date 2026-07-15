import type { QuestDef } from '../types'

/** The quest board: one-shot asks from travelers, three per region. Kill
 *  objectives with `enemyId: null` count any foe slain in the quest's region;
 *  collect objectives count materials the moment they are looted. */
const DEFS: QuestDef[] = [
  // ── Hollowroot Cavern (Lv 1–3) ──────────────────────────────────────
  {
    id: 'q-hollow-fiber',
    name: 'Dye for the Guild',
    giver: 'Maro the Tinct-Seller',
    text: 'My reds have gone grey without mossroot. Bring me armfuls and I will owe you a colour.',
    regionId: 'hollowroot',
    objective: { kind: 'collect', materialId: 'mossroot-fiber', count: 8 },
    reward: { xp: 80, gold: 40, gear: null },
  },
  {
    id: 'q-hollow-cull',
    name: 'Cull the Cavern',
    giver: 'Warden Selk',
    text: 'The dark below breeds faster than I can count it. Go down and subtract.',
    regionId: 'hollowroot',
    objective: { kind: 'kill', enemyId: null, count: 12 },
    reward: { xp: 100, gold: 30, gear: { ilvl: 3, minRarity: 'uncommon' } },
  },
  {
    id: 'q-hollow-bruiser',
    name: 'The Toll-Taker',
    giver: 'Pilgrim Osset',
    text: 'A bruiser of stone demands a toll of bones at the low tunnel. I have paid twice. No more.',
    regionId: 'hollowroot',
    objective: { kind: 'kill', enemyId: 'rockmaw-bruiser', count: 2 },
    reward: { xp: 140, gold: 60, gear: { ilvl: 4, minRarity: 'rare' } },
  },

  // ── Duskmire Weald (Lv 4–6) ─────────────────────────────────────────
  {
    id: 'q-dusk-amber',
    name: 'Amber for the Apothecary',
    giver: 'Apothecary Vell',
    text: 'The mire preserves what it drowns. Its amber steadies a failing heart — bring me what it hoards.',
    regionId: 'duskmire',
    objective: { kind: 'collect', materialId: 'bog-amber', count: 6 },
    reward: { xp: 160, gold: 70, gear: null },
  },
  {
    id: 'q-dusk-wolves',
    name: 'Teeth in the Fog',
    giver: 'Carter Brann',
    text: 'My oxen will not take the ford road while the wolves sing. Quiet the choir.',
    regionId: 'duskmire',
    objective: { kind: 'kill', enemyId: 'duskwolf', count: 8 },
    reward: { xp: 200, gold: 60, gear: { ilvl: 6, minRarity: 'uncommon' } },
  },
  {
    id: 'q-dusk-wisps',
    name: 'Lanterns for the Lost',
    giver: 'Pilgrim Osset',
    text: 'What the wisps shed can be caught and blessed into honest light. The lost deserve lanterns that do not lie.',
    regionId: 'duskmire',
    objective: { kind: 'collect', materialId: 'wisp-residue', count: 8 },
    reward: { xp: 220, gold: 80, gear: { ilvl: 6, minRarity: 'rare' } },
  },

  // ── Stormcrag Peaks (Lv 7–9) ────────────────────────────────────────
  {
    id: 'q-storm-quartz',
    name: 'A Storm in a Stone',
    giver: 'Runesmith Bekka',
    text: 'Quartz that has drunk a hundred storms will hold a rune the way iron never could. Climb, and bring me thunder.',
    regionId: 'stormcrag',
    objective: { kind: 'collect', materialId: 'storm-quartz', count: 8 },
    reward: { xp: 320, gold: 110, gear: { ilvl: 9, minRarity: 'rare' } },
  },
  {
    id: 'q-storm-harpies',
    name: 'Clip Their Wings',
    giver: 'Roostkeeper Dane',
    text: 'The skyrenders have taken three of my messenger hawks this season. I am done sending them apologies.',
    regionId: 'stormcrag',
    objective: { kind: 'kill', enemyId: 'harpy-skyrender', count: 8 },
    reward: { xp: 300, gold: 100, gear: null },
  },
  {
    id: 'q-storm-behemoth',
    name: "The Mountain's Fist",
    giver: 'Warden Selk',
    text: 'Something up there has learned to throw the mountain at travellers, a piece at a time. Unteach it.',
    regionId: 'stormcrag',
    objective: { kind: 'kill', enemyId: 'crag-behemoth', count: 2 },
    reward: { xp: 360, gold: 150, gear: { ilvl: 10, minRarity: 'rare' } },
  },

  // ── The Ashen Wastes (Lv 10–12) ─────────────────────────────────────
  {
    id: 'q-ash-cinders',
    name: "Coals That Won't Die",
    giver: 'Forgemistress Ida',
    text: 'Ash from the wastes never quite goes out. My forge could burn a week on a pouch of it. Fill the pouch.',
    regionId: 'ashen-wastes',
    objective: { kind: 'collect', materialId: 'cinder-ash', count: 10 },
    reward: { xp: 420, gold: 150, gear: null },
  },
  {
    id: 'q-ash-hounds',
    name: 'Hounds of the Grey Wind',
    giver: 'Carter Brann',
    text: 'The hounds out there drip embers where they walk. My cargo is lamp oil. You see my difficulty.',
    regionId: 'ashen-wastes',
    objective: { kind: 'kill', enemyId: 'cinderhound', count: 8 },
    reward: { xp: 460, gold: 140, gear: { ilvl: 12, minRarity: 'uncommon' } },
  },
  {
    id: 'q-ash-glass',
    name: 'A Lens for the Observatory',
    giver: 'The Cartographer Royal',
    text: 'Ground true, obsidian shows the sky behind the sky. My charts have a hole in them shaped like that glass.',
    regionId: 'ashen-wastes',
    objective: { kind: 'collect', materialId: 'obsidian-glass', count: 6 },
    reward: { xp: 520, gold: 180, gear: { ilvl: 12, minRarity: 'rare' } },
  },

  // ── The Sundered Spire (Lv 13–15) ───────────────────────────────────
  {
    id: 'q-spire-shards',
    name: 'Fragments of the Wound',
    giver: 'The Cartographer Royal',
    text: 'Every shard is a map of somewhere that should not exist. I intend to chart it anyway.',
    regionId: 'sundered-spire',
    objective: { kind: 'collect', materialId: 'void-shard', count: 8 },
    reward: { xp: 700, gold: 240, gear: { ilvl: 15, minRarity: 'epic' } },
  },
  {
    id: 'q-spire-chant',
    name: 'Silence the Chanting',
    giver: 'Exorcist Piel',
    text: 'The acolytes chant the Spire wider by a finger-width a day. Their throats are the hinge of the world. Close them.',
    regionId: 'sundered-spire',
    objective: { kind: 'kill', enemyId: 'void-acolyte', count: 6 },
    reward: { xp: 650, gold: 220, gear: null },
  },
  {
    id: 'q-spire-herald',
    name: 'Kill the Messenger',
    giver: 'Exorcist Piel',
    text: 'The Herald announces a king I would rather not meet. Let the announcement go undelivered.',
    regionId: 'sundered-spire',
    objective: { kind: 'kill', enemyId: 'herald-of-malgrath', count: 2 },
    reward: { xp: 800, gold: 300, gear: { ilvl: 15, minRarity: 'epic' } },
  },
]

export const QUESTS: readonly QuestDef[] = DEFS
export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(DEFS.map((q) => [q.id, q]))
