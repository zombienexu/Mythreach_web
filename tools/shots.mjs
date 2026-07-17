// npm run shots — build, boot the preview server, and capture the README
// screenshots: the title screen, character creation, a fresh fight, a
// mid-game pull, the bags, and the quest board. The game opens on the title
// screen now, so every shot passes through it.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0 } })
const { port } = server.httpServer.address()

await mkdir('docs', { recursive: true })

const browser = await chromium.launch()

// ── shots 0+1: a fresh hero — creation ceremony, then the first fight ──
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(2200) // settle fonts + the wordmark's arrival
  await page.getByRole('button', { name: /Begin a new legend/ }).first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'docs/shot-create.png', fullPage: true })
  await page.getByRole('button', { name: 'Begin the long hunt' }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Start fight' }).click()
  await page.waitForTimeout(500)
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

// The identity the title screen shows for that save.
const profile = {
  name: 'Vespermere',
  classId: 'arcanist',
  originId: 'guild-courier',
  signId: 'moth',
  createdAt: Date.now() - 3 * 86_400_000,
  playedAt: Date.now() - 2 * 3_600_000,
}

/** Seed the mid-game save + profile and land on the title screen. */
async function openTitle(page) {
  await page.addInitScript(
    ([s, p]) => {
      localStorage.setItem('mythreach-save-v1', s)
      localStorage.setItem('mythreach-profile-s1-v1', p)
    },
    [JSON.stringify(save), JSON.stringify(profile)],
  )
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(2200)
}

/** Click through the occupied slot into the world. */
async function enterReach(page) {
  await page.getByRole('button', { name: /Enter the Reach/ }).click()
  await page.waitForTimeout(1000)
}

// ── shot-title: the front door, with a legend waiting on slot 1 ──────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await openTitle(page)
  await page.screenshot({ path: 'docs/shot-title.png' })
  await page.close()
}

// ── shot 2: a geared hero fighting in the Emberwild (v2 save → region) ──
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await openTitle(page)
  await enterReach(page)
  await page.getByRole('button', { name: 'Start fight' }).click()
  await page.waitForTimeout(500)
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
  await openTitle(page)
  await enterReach(page)
  await page.getByRole('button', { name: 'Character' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/shot-3.png' })
  await page.close()
}

// ── shot 4: the quest board ─────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await openTitle(page)
  await enterReach(page)
  await page.getByRole('button', { name: 'Quests' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/shot-4.png' })
  await page.close()
}

console.log('wrote docs/shot-title.png shot-create.png shot-1..4.png')

await browser.close()
server.httpServer.close()
