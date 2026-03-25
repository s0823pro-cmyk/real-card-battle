/**
 * src/assets 以下の PNG / JPEG を sharp で再エンコードして容量削減。
 * 実行: npm run compress:images
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dirs = ['src/assets'];
const exts = ['.png', '.jpg', '.jpeg'];

async function compress(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      await compress(full);
      continue;
    }
    const ext = path.extname(f.name).toLowerCase();
    if (!exts.includes(ext)) continue;

    const before = fs.statSync(full).size;
    const tmp = full + '.tmp';
    try {
      if (ext === '.png') {
        await sharp(full)
          .png({ compressionLevel: 9, effort: 10 })
          .toFile(tmp);
      } else {
        await sharp(full).jpeg({ quality: 75, mozjpeg: true }).toFile(tmp);
      }
      fs.rmSync(full, { force: true });
      fs.renameSync(tmp, full);
      const after = fs.statSync(full).size;
      const rel = path.relative(process.cwd(), full);
      console.log(`${rel}: ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`);
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.error(`skip: ${full}`, e.message);
    }
  }
}

async function main() {
  const root = process.cwd();
  for (const d of dirs) {
    const abs = path.isAbsolute(d) ? d : path.join(root, d);
    if (!fs.existsSync(abs)) {
      console.warn(`skip missing dir: ${abs}`);
      continue;
    }
    await compress(abs);
  }
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
