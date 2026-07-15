// npm run shots — build, boot the preview server, and capture the three
// README screenshots: a fresh fight, a mid-game pull, and the bags.
// Combat is endless now: packs spawn on their own, so there is no embark.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0 } })
const { port } = server.httpServer.address()

await mkdir('docs', { recursive: true })

const browser = await chromium.launch()

// ── shot 1: a fresh hero's first fight in the Verdant Reach ─────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(2000) // settle fonts + the first pack arrives
  await page.keyboard.press('2') // Ignite
  await page.waitForTimeout(500)
  await page.keyboard.press('1') // Fireball
  await page.waitForTimeout(1600)
  await page.screenshot({ path: 'docs/shot-1.png' }) // DoT ticking, fireball mid-cast
  await page.close()
}

// A mid-game save (v2): level 12, geared, deep in Duskmire.
const save = {
  version: 2,
  level: 12,
  xp: 900,
  gold: 780,
  talents: { searingFlames: 5, criticalMass: 3, impFireball: 2, fortitude: 1 },
  equipped: {
    staff: { uid: 1, name: 'Stormbound Staff of the Comet', slot: 'staff', ilvl: 9, rarity: 'rare', stats: { power: 18, stamina: 6 } },
    robe: { uid: 2, name: 'Starforged Robe of Burning Thought', slot: 'robe', ilvl: 10, rarity: 'epic', stats: { power: 16, stamina: 10, crit: 6 } },
    ring: { uid: 3, name: 'Moonlit Ring of the Phoenix', slot: 'ring', ilvl: 8, rarity: 'rare', stats: { crit: 8, spirit: 4 } },
  },
  inventory: [
    { uid: 4, name: 'Runed Hood of Still Water', slot: 'hood', ilvl: 9, rarity: 'rare', stats: { spirit: 9, stamina: 6 } },
    { uid: 5, name: 'Gleaming Talisman of Deep Roots', slot: 'trinket', ilvl: 8, rarity: 'uncommon', stats: { stamina: 11 } },
    { uid: 6, name: 'Whispering Ring of Sudden Fury', slot: 'ring', ilvl: 9, rarity: 'rare', stats: { power: 7, crit: 7 } },
  ],
  nextUid: 100,
  zoneId: 'stormcrag',
  bossesDefeated: ['hollowroot'],
  achievements: ['first-blood', 'level-5', 'level-10', 'boss-grubthar', 'kills-100'],
  lifetime: { kills: 132, deaths: 3, goldEarned: 1450, interrupts: 9, epicsFound: 1, bossKills: 1 },
  records: { expeditionsCompleted: 4, worldBossFells: 0, bestAssaultDamage: 3200, fastestBossKills: { hollowroot: 900 } },
  worldBossHp: 31000,
  companionId: null,
  autoBattle: false,
  completed: false,
}

// ── shot 2: a geared hero fighting in the Emberwild (v2 save → region) ──
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.addInitScript((s) => localStorage.setItem('mythreach-save-v1', s), JSON.stringify(save))
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(2000) // the first pack arrives
  await page.keyboard.press('2') // Ignite
  await page.waitForTimeout(400)
  await page.keyboard.press('7') // Combustion
  await page.waitForTimeout(400)
  await page.keyboard.press('4') // Pyroblast
  await page.waitForTimeout(4250)
  await page.screenshot({ path: 'docs/shot-2.png' }) // the comet detonating
  await page.close()
}

// ── shot 3: the bags ────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.addInitScript((s) => localStorage.setItem('mythreach-save-v1', s), JSON.stringify(save))
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Character' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/shot-3.png' })
  await page.close()
}

console.log('wrote docs/shot-1.png docs/shot-2.png docs/shot-3.png')

await browser.close()
server.httpServer.close()
