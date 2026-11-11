import { readdirSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const [dir, prefix, perArg, wArg] = process.argv.slice(2); const per = Number(perArg); const w = Number(wArg);
const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && /-\d\d\.png$/.test(f)).sort();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (let i = 0; i < files.length; i += per) {
  const html = `<body style="margin:0;background:#444;display:flex;gap:8px;align-items:flex-start">${files.slice(i, i + per).map((f) => `<img style="width:${w}px" src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}">`).join('')}</body>`;
  const page = await browser.newPage();
  await page.setViewport({ width: per * (w + 8), height: 600 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: `${dir}/sheet-${prefix}-${String(i / per + 1).padStart(2, '0')}.png`, fullPage: true });
  await page.close();
}
await browser.close();
