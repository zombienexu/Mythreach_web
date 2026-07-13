// npm run shots — build, boot the preview server, play the same key timeline
// as the Godot repo's tools/screenshot.gd (2 @ 0.4s, 1 @ 0.6s, 3 @ 4.0s;
// captures at ~1.7s / 3.4s / 5.0s), writing docs/shot-{1,2,3}.png.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0 } })
const { port } = server.httpServer.address()

await mkdir('docs', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`http://localhost:${port}/`)
await page.waitForTimeout(600) // settle: fonts, first paint

const t0 = Date.now()
const at = (ms) => new Promise((r) => setTimeout(r, Math.max(0, t0 + ms - Date.now())))

await at(400)
await page.keyboard.press('2') // Ignite
await at(600)
await page.keyboard.press('1') // Fireball
await at(1700)
await page.screenshot({ path: 'docs/shot-1.png' }) // DoT ticking, fireball mid-cast
await at(3400)
await page.screenshot({ path: 'docs/shot-2.png' }) // fireball landed
await at(4000)
await page.keyboard.press('3') // Renew
await at(5000)
await page.screenshot({ path: 'docs/shot-3.png' }) // renew mid-cast

console.log('wrote docs/shot-1.png docs/shot-2.png docs/shot-3.png')

await browser.close()
server.httpServer.close()
