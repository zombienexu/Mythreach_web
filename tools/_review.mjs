import { chromium } from 'playwright'
import { createServer } from 'vite'

const server = await createServer({ root: '/home/ztovs/work/mythreach-web', server: { port: 5199 } })
await server.listen()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://localhost:5199/')
await page.waitForTimeout(1200) // fonts + first paint
await page.screenshot({ path: process.argv[2] ?? '/tmp/m2.png' })
await browser.close()
await server.close()
