/**
 * runData が参照するがディスクに無いお守り PNG を生成する（ビルド用プレースホルダ）。
 * 本番アートは src/assets/omamori/ に同名で上書きすること。
 */
import sharp from 'sharp';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '../src/assets/omamori');

const NAMES = [
  'foreman_hammer.png',
  'blueprint_relic.png',
  'safety_belt.png',
  'ink_pot.png',
  'foreman_happi.png',
  'circular_saw.png',
  'wood_charm.png',
  'site_bento.png',
  'nail_pouch.png',
  'craftsman_chisel.png',
  'cook_license.png',
  'iron_stomach.png',
  'old_recipe.png',
  'cook_mindset.png',
  'worn_pot.png',
  'cook_knife.png',
  'secret_sauce_bottle.png',
  'cutting_board_relic.png',
  'head_chef_hat.png',
  'food_lover.png',
  'whetstone.png',
  'talisman.png',
  'travel_map.png',
  'merchant_charm.png',
  'guts_headband.png',
  'black_cat_charm.png',
  'golden_bowl.png',
  'shichifukujin.png',
  'midnight_overtime.png',
  'fighting_spirit_band.png',
  'big_dice.png',
  'stable_dice.png',
  'growth_proof.png',
];

const bg = { r: 142, g: 148, b: 156 };

for (const name of NAMES) {
  const out = join(dir, name);
  try {
    await access(out);
    console.log('skip (exists):', name);
    continue;
  } catch {
    // missing
  }
  await sharp({
    create: { width: 500, height: 500, channels: 3, background: bg },
  })
    .png()
    .toFile(out);
  console.log('ok:', name);
}
