// Erzeugt Vorschaubilder für geteilte Links (1200 × 630) und App-Icons aus HTML – mit der selbst gehosteten Schrift.
// Nutzt den lokal installierten Chrome oder Edge über puppeteer-core. Aufruf: npm run og
import { existsSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const font = readFileSync(new URL('../node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2', import.meta.url)).toString('base64');
const executablePath = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!executablePath) throw new Error('Kein Chrome/Edge gefunden. Pfad über CHROME=… angeben.');

const base = `@font-face{font-family:A;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
*{margin:0;box-sizing:border-box}body{background:#0a090c;color:#f3eee6;font-family:A,sans-serif;overflow:hidden}`;

// Radar-Fächer als Hintergrundmotiv
const rays = Array.from({ length: 32 }, (_, i) => { const a = (i * 11.25 * Math.PI) / 180; return `<line x1="${Math.cos(a) * 60}" y1="${Math.sin(a) * 60}" x2="${Math.cos(a) * 300}" y2="${Math.sin(a) * 300}"/>`; }).join('');
const fan = (style) => `<svg viewBox="-300 -300 600 600" style="position:absolute;${style};fill:none;stroke:rgb(243 238 230/.09);stroke-width:.9">${rays}${[60, 120, 180, 240, 298].map((r) => `<circle r="${r}" stroke="rgb(226 60 196/.45)"/>`).join('')}</svg>`;
const dot = (x, y, s, c = '#c922ab') => `<span style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:${c};box-shadow:0 0 0 ${s * 0.35}px rgb(242 90 211/.18)"></span>`;
const cover = (over, lines, foot) => `<!doctype html><style>${base}
.c{position:relative;width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 88% 50%,rgb(201 34 171/.32),transparent 55%),#0a090c}
.o{font-stretch:125%;font-weight:600;font-size:22px;letter-spacing:.16em;text-transform:uppercase;color:#f25ad3;display:flex;align-items:center;gap:14px}
.o::before{content:'';width:12px;height:12px;border-radius:50%;background:#f25ad3}
h1{font-stretch:62%;font-weight:900;text-transform:uppercase;font-size:150px;line-height:.84;letter-spacing:-.01em}
h1 em{font-style:normal;color:#f25ad3}
.f{display:flex;justify-content:space-between;align-items:flex-end;font-size:26px;color:#bcb6b0}
.l{font-size:54px;font-weight:850;letter-spacing:-.035em;color:#f3eee6}.l i{font-style:normal;color:#f25ad3}</style>
<div class="c">${fan('right:-230px;top:-170px;width:970px;height:970px')}${dot(1000, 118, 32)}${dot(1124, 222, 22)}${dot(1070, 452, 20, '#e9e4dc')}
<p class="o">${over}</p><h1>${lines}</h1><div class="f"><span>${foot}</span><span class="l">Spots<i>.</i></span></div></div>`;

const icon = (size) => `<!doctype html><style>${base}
body{width:${size}px;height:${size}px;display:grid;place-items:center;background:#0a090c}
div{width:${size}px;height:${size}px;display:grid;place-items:center;background:radial-gradient(circle,rgb(201 34 171/.35),transparent 70%)}</style>
<div><svg viewBox="0 0 64 64" width="${size * 0.82}" height="${size * 0.82}"><circle cx="32" cy="32" r="22" fill="none" stroke="#c922ab" stroke-width="3" opacity=".55"/><circle cx="32" cy="32" r="12" fill="none" stroke="#c922ab" stroke-width="3"/><circle cx="32" cy="32" r="5.5" fill="#f25ad3"/></svg></div>`;

const jobs = [
  ['public/og-start.png', 1200, 630, cover('Live-Radar für die Nacht', 'Wo geht<br><em>heute</em> was?', 'Partys, Clubs &amp; Events in Karlsruhe')],
  ['public/og-veranstalter.png', 1200, 630, cover('Für Clubs, Bars &amp; Event-Crews', 'Dein Event.<br>Auf ihrem <em>Radar.</em>', 'Kostenlos eintragen · Partner werden')],
  ['public/apple-touch-icon.png', 180, 180, icon(180)],
  ['public/icon-192.png', 192, 192, icon(192)],
  ['public/icon-512.png', 512, 512, icon(512)],
  ['public/favicon-32.png', 32, 32, icon(32)],
];

const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  for (const [path, width, height, html] of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path, clip: { x: 0, y: 0, width, height } });
    await page.close();
    console.log(path);
  }
} finally {
  await browser.close();
}
