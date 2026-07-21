// ─────────────────────────────────────────────────────────────────────────
// Level-10 Fire Mage save — the redesigned Arcanist, full kit taught.
//
// HOW TO USE: run `npm run dev`, open the app, then paste this whole file into
// the browser DevTools console and press Enter. It seeds save slot 1 and
// reloads. From the title, click "Enter the Reach".
//
// You start at level 10 in the Ember-Lord tier, so the WHOLE fire kit is
// taught: Fireball (1) · Detonate (2) · Kindle (3) · Wildfire (4) ·
// Flashpoint (5) · Inferno (6), plus the calling — Stoke — on the heart of the
// wheel / Space. Heat is already flowing and every foe reads a tell.
// ─────────────────────────────────────────────────────────────────────────
;(() => {
  const now = Date.now()

  // The character sheet (engine save, slot 1).
  localStorage.setItem(
    'mythreach-save-v1',
    JSON.stringify({
      version: 5,
      level: 10,
      xp: 0,
      gold: 2400,
      classId: 'arcanist',
      originId: 'ashmarch-survivor',
      signId: 'tower',
      // 9 talent points, all poured into the fire tree.
      talents: { impFireball: 3, searingFlames: 3, criticalMass: 3 },
      equipped: {
        staff: { uid: 1, name: 'Emberheart Focus', slot: 'staff', ilvl: 11, rarity: 'rare', stats: { power: 14, crit: 4 } },
        robe: { uid: 2, name: 'Cinderweave Robe', slot: 'robe', ilvl: 10, rarity: 'uncommon', stats: { stamina: 8, power: 4 } },
        trinket: { uid: 3, name: 'Emberglass Charm', slot: 'trinket', ilvl: 11, rarity: 'epic', stats: { crit: 10, power: 6 } },
      },
      inventory: [],
      nextUid: 4,
      regionId: 'stormcrag',
      materials: {},
      activeQuests: {},
      completedQuests: [],
      achievements: [],
      lifetime: { kills: 120, deaths: 3, goldEarned: 5000, interrupts: 8, epicsFound: 1, bossKills: 0 },
      records: { worldBossFells: 0, bestAssaultDamage: 0 },
      worldBossHp: 40000,
      companionId: null,
      ledgerPages: 0,
      autoBattle: false,
    }),
  )

  // The meta layer: Standing 900 = Ember-Lord, so the whole fire kit is taught.
  localStorage.setItem(
    'mythreach-expedition-v1',
    JSON.stringify({ standing: 900, progress: {}, transmitted: [], briefed: true }),
  )

  // The title-screen card for the slot.
  localStorage.setItem(
    'mythreach-profile-s1-v1',
    JSON.stringify({
      name: 'Emberwright',
      classId: 'arcanist',
      originId: 'ashmarch-survivor',
      signId: 'tower',
      createdAt: now,
      playedAt: now,
    }),
  )

  location.reload()
})()
