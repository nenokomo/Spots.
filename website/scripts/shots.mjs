// Screenshots der Website in Handy-, Tablet- und Desktop-Breite (für Review und Pull Request).
// Nutzt den lokal installierten Chrome oder Edge über puppeteer-core, lädt nichts herunter.
// Aufruf: npm run shots -- [Basis-URL] [Ausgabeordner]   (Standard: http://localhost:4321, docs/screenshots)
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://localhost:4321';
const out = process.argv[3] || 'docs/screenshots';
const pages = (process.env.PAGES || '/,/veranstalter/').split(',');
const widths = (process.env.WIDTHS || '390,834,1440').split(',').map(Number);
const slices = process.env.SLICES === '1'; // zusätzlich bildschirmhohe Ausschnitte für die Detailprüfung

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const executablePath = process.env.CHROME || browsers.find((p) => existsSync(p));
if (!executablePath) throw new Error('Kein Chrome/Edge gefunden. Pfad über CHROME=… angeben.');

await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] });
try {
  for (const path of pages) {
    for (const width of widths) {
      const page = await browser.newPage();
      const height = width < 600 ? 844 : width < 1000 ? 1112 : 900;
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
      // Reduzierte Bewegung: alle Einblend-Animationen sofort fertig, damit der Screenshot vollständig ist.
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(new URL(path, base).href, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      const name = (path.replace(/\//g, '-').replace(/^-|-$/g, '') || 'start') + `-${width}`;
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
      if (slices) {
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0, i = 1; y < total; y += height, i++) {
          await page.screenshot({ path: `${out}/${name}-${String(i).padStart(2, '0')}.png`, clip: { x: 0, y, width, height: Math.min(height, total - y) }, captureBeyondViewport: true });
        }
      }
      console.log(`${name}.png`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
