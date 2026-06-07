import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs/generated-assets/steam-store');
const keyArtPath = path.join(rootDir, 'src/assets/home_background.png');
const iconPath = path.join(rootDir, 'resources/icon.png');
const titleDir = path.join(rootDir, 'src/assets/title');

const titleLetters = [
  'letter_J.png',
  'letter_O.png',
  'letter_B.png',
  'letter_L.png',
  'letter_E.png',
  'letter_S.png',
  'letter_S2.png',
];

const capsuleAssets = [
  { file: 'store_header_capsule_920x430.png', width: 920, height: 430, logoWidth: 650, logoHeight: 150 },
  { file: 'store_small_capsule_462x174.png', width: 462, height: 174, logoWidth: 360, logoHeight: 80 },
  { file: 'store_main_capsule_1232x706.png', width: 1232, height: 706, logoWidth: 760, logoHeight: 170 },
  { file: 'store_vertical_capsule_748x896.png', width: 748, height: 896, logoWidth: 570, logoHeight: 130, topRatio: 0.09 },
  { file: 'library_capsule_600x900.png', width: 600, height: 900, logoWidth: 470, logoHeight: 110, topRatio: 0.1 },
  { file: 'library_header_capsule_920x430.png', width: 920, height: 430, logoWidth: 650, logoHeight: 150 },
  { file: 'event_cover_800x450.png', width: 800, height: 450, logoWidth: 560, logoHeight: 130 },
  { file: 'event_header_1920x622.png', width: 1920, height: 622, logoWidth: 920, logoHeight: 200 },
];

async function buildLogo(maxWidth, maxHeight) {
  const gapRatio = -0.05;
  const letterHeight = Math.floor(Math.min(maxHeight, maxWidth / (titleLetters.length + gapRatio * (titleLetters.length - 1))));
  const gap = Math.round(letterHeight * gapRatio);
  const width = letterHeight * titleLetters.length + gap * (titleLetters.length - 1);
  const height = letterHeight;

  const composites = [];
  let left = 0;
  for (const file of titleLetters) {
    const input = await sharp(path.join(titleDir, file))
      .resize(letterHeight, letterHeight, { fit: 'contain' })
      .png()
      .toBuffer();
    composites.push({ input, left, top: 0 });
    left += letterHeight + gap;
  }

  const input = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return { input, width, height };
}

function gradientOverlay(width, height, strength = 0.62) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#050607" stop-opacity="${strength * 0.78}"/>
          <stop offset="0.45" stop-color="#050607" stop-opacity="${strength * 0.28}"/>
          <stop offset="1" stop-color="#050607" stop-opacity="${strength}"/>
        </linearGradient>
        <radialGradient id="r" cx="50%" cy="38%" r="72%">
          <stop offset="0" stop-color="#f8d57a" stop-opacity="0.12"/>
          <stop offset="1" stop-color="#050607" stop-opacity="0.18"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
      <rect width="100%" height="100%" fill="url(#r)"/>
    </svg>
  `);
}

async function createCapsuleAsset(asset) {
  const base = await sharp(keyArtPath)
    .resize(asset.width, asset.height, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 1.02, brightness: 0.96 })
    .png()
    .toBuffer();
  const logo = await buildLogo(asset.logoWidth, asset.logoHeight);
  const top = Math.round(asset.height * (asset.topRatio ?? 0.12));
  const left = Math.round((asset.width - logo.width) / 2);

  await sharp(base)
    .composite([
      { input: gradientOverlay(asset.width, asset.height), left: 0, top: 0 },
      { input: logo.input, left, top },
    ])
    .png()
    .toFile(path.join(outDir, asset.file));
}

async function createArtworkOnly(file, width, height) {
  await sharp(keyArtPath)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 0.94, brightness: 0.72 })
    .composite([{ input: gradientOverlay(width, height, 0.48), left: 0, top: 0 }])
    .png()
    .toFile(path.join(outDir, file));
}

async function createLibraryLogo() {
  const width = 1280;
  const height = 720;
  const logo = await buildLogo(1040, 230);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo.input, left: Math.round((width - logo.width) / 2), top: Math.round((height - logo.height) / 2) }])
    .png()
    .toFile(path.join(outDir, 'library_logo_1280x720.png'));
}

async function createIcons() {
  await sharp(iconPath)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(path.join(outDir, 'shortcut_icon_256x256.png'));

  await sharp(iconPath)
    .resize(184, 184, { fit: 'cover' })
    .flatten({ background: '#050607' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(path.join(outDir, 'app_icon_184x184.jpg'));
}

await fs.mkdir(outDir, { recursive: true });

for (const asset of capsuleAssets) {
  await createCapsuleAsset(asset);
}

await createArtworkOnly('page_background_1438x810.png', 1438, 810);
await createArtworkOnly('library_hero_3840x1240.png', 3840, 1240);
await createLibraryLogo();
await createIcons();

const files = await fs.readdir(outDir);
for (const file of files.sort()) {
  const meta = await sharp(path.join(outDir, file)).metadata();
  console.log(`${file} ${meta.width}x${meta.height}`);
}
