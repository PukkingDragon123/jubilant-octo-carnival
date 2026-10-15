// Generates the app icon (SVG + PNGs) from the pixel-art buddy face.
// Usage: node scripts/make-icons.mjs  (PNG export needs Playwright + Chromium)
import { writeFileSync, mkdirSync } from 'node:fs';
import { ICONS } from '../src/ui/pixel.js';

const KEYS = { n: '#eba155', T: '#fff4e4', q: '#ff9db5', k: '#2a2140', W: '#ffffff' };
const rows = ICONS.buddy.rows;
const w = rows[0].length, h = rows.length;
const pad = 3;
const size = Math.max(w, h) + pad * 2;
let rects = '';
// ink outline first (1px around filled pixels), then the pixels
const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
for (let y = -1; y <= h; y++)
  for (let x = -1; x <= w; x++)
    if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)))
      rects += `<rect x="${x + pad}" y="${y + pad + 0.5}" width="1" height="1" fill="#2a2140"/>`;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const c = rows[y][x];
    if (c !== '.') rects += `<rect x="${x + pad}" y="${y + pad + 0.5}" width="1" height="1" fill="${(ICONS.buddy.keys || {})[c] || KEYS[c]}"/>`;
  }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
<rect width="${size}" height="${size}" rx="3" fill="#2b2545"/>
<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="2" fill="#ff7fae"/>
<rect x="1" y="${size - 4}" width="${size - 2}" height="3" fill="#d9577f"/>
${rects}
</svg>
`;
mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon.svg', svg);
console.log('wrote icons/icon.svg');

try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const px of [192, 512]) {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}`);
    await page.screenshot({ path: `icons/icon-${px}.png`, omitBackground: true });
    console.log(`wrote icons/icon-${px}.png`);
  }
  await browser.close();
} catch (e) {
  console.log('PNG export skipped (Playwright not available):', e.message);
}
