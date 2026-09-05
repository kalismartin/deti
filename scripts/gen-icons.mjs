// Generates PWA icons (PNG) from an inline SVG using sharp. Run: npm run icons
//
// The mark: adult + child figures on a brand gradient. No wordmark — the
// launcher already shows the app name under the icon.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const svg = (maskable) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 110}" fill="url(#bg)"/>
  <g${maskable ? ' transform="translate(256 256) scale(0.78) translate(-256 -256)"' : ''}>
    <g fill="#ffffff">
      <circle cx="192" cy="176" r="48"/>
      <rect x="144" y="238" width="96" height="150" rx="48"/>
    </g>
    <g fill="#ffffff" opacity="0.92">
      <circle cx="324" cy="228" r="36"/>
      <rect x="288" y="278" width="72" height="112" rx="36"/>
    </g>
  </g>
</svg>`;

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]) {
  await sharp(Buffer.from(svg(maskable))).resize(size, size).png().toFile(join(outDir, name));
  console.log(`${name} generated`);
}
