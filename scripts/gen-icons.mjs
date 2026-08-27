// Generates PWA icons (PNG) from an inline SVG using sharp. Run: npm run icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#2563eb"/>
  <g transform="translate(256 236)">
    <circle r="${pad ? 118 : 138}" fill="#fff"/>
    <circle r="${pad ? 118 : 138}" fill="none" stroke="#1e40af" stroke-width="14"/>
    <line x1="0" y1="0" x2="0" y2="${pad ? -72 : -84}" stroke="#1e40af" stroke-width="16" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="${pad ? 52 : 62}" y2="${pad ? 26 : 30}" stroke="#1e40af" stroke-width="16" stroke-linecap="round"/>
  </g>
  <text x="256" y="${pad ? 448 : 460}" font-family="Arial, sans-serif" font-size="${pad ? 84 : 96}" font-weight="bold" fill="#fff" text-anchor="middle">DĚTI</text>
</svg>`;

for (const [name, size, pad] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(join(outDir, name));
  console.log(`${name} generated`);
}
