/**
 * public/locales/en.json / ko.json を生成（プレースホルダーは日本語のまま）。
 * 実行: npx tsx scripts/generate-locale-json.ts
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ja } from '../src/i18n/ja.ts';
import { ACHIEVEMENTS } from '../src/data/achievementDefinitions.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function findBalancedClosingBrace(src: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function unescapeTsString(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function extractBlocksWithIdField(src: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  while (from < src.length) {
    const idx = src.indexOf("id: '", from);
    if (idx === -1) break;
    const blockStart = src.lastIndexOf('{', idx);
    if (blockStart === -1 || blockStart < from - 1) {
      from = idx + 5;
      continue;
    }
    const blockEnd = findBalancedClosingBrace(src, blockStart);
    if (blockEnd === -1) {
      from = idx + 5;
      continue;
    }
    blocks.push(src.slice(blockStart, blockEnd));
    from = blockEnd;
  }
  return blocks;
}

function pickQuoted(field: string, block: string): string | null {
  const re = new RegExp(`${field}:\\s*'((?:\\\\.|[^'\\\\])*)'`);
  const m = block.match(re);
  return m ? unescapeTsString(m[1]) : null;
}

function classifyBlock(block: string): 'card' | 'omamori' | 'event' | 'other' {
  if (/\bchoices:\s*\[/.test(block)) return 'event';
  if (/\btype:\s*'(attack|skill|power|tool|status|curse)'/.test(block)) return 'card';
  if (/\beffect:\s*\{/.test(block) && /\bjobId:\s*'/.test(block)) return 'omamori';
  return 'other';
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'stories') continue;
      walkTsFiles(p, acc);
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

function mergeCardEventOmamoriFromDataFiles(out: Record<string, string>): void {
  const dataRoot = join(root, 'src', 'data');
  const files = walkTsFiles(dataRoot);
  const seenCard = new Set<string>();
  const seenOmamori = new Set<string>();
  const seenEvent = new Set<string>();

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const block of extractBlocksWithIdField(src)) {
      const id = pickQuoted('id', block);
      if (!id || id.includes('${')) continue;
      const name = pickQuoted('name', block);
      const description = pickQuoted('description', block);
      const kind = classifyBlock(block);
      if (kind === 'card' && name && description !== null) {
        if (seenCard.has(id)) continue;
        seenCard.add(id);
        out[`card.${id}.name`] = name;
        out[`card.${id}.description`] = description;
      } else if (kind === 'omamori' && name && description !== null) {
        if (seenOmamori.has(id)) continue;
        seenOmamori.add(id);
        out[`omamori.${id}.name`] = name;
        out[`omamori.${id}.description`] = description;
      } else if (kind === 'event' && name && description !== null) {
        if (seenEvent.has(id)) continue;
        seenEvent.add(id);
        out[`event.${id}.name`] = name;
        out[`event.${id}.description`] = description;
        const choicesMatch = block.match(/choices:\s*\[([\s\S]*?)\]\s*,/);
        if (choicesMatch) {
          const ch = choicesMatch[1];
          let ci = 0;
          const textRe = /text:\s*'((?:\\.|[^'\\])*)'/g;
          let tm: RegExpExecArray | null;
          while ((tm = textRe.exec(ch)) !== null) {
            out[`event.${id}.choice.${ci}.text`] = unescapeTsString(tm[1]);
            ci += 1;
          }
        }
      }
    }
  }
}

function mergeTemplateEnemies(src: string, out: Record<string, string>): void {
  const re = /templateId:\s*'([^']+)'\s*,\s*\n\s*name:\s*'((?:\\.|[^'\\])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out[`enemy.${m[1]}.name`] = unescapeTsString(m[2]);
  }
}

function mergeBuiltinEnemies(out: Record<string, string>): void {
  const path = join(root, 'src', 'data', 'enemies.ts');
  const src = readFileSync(path, 'utf8');
  const re = /(\w+):\s*\{\s*\n\s*name:\s*'((?:\\.|[^'\\])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out[`enemy.${m[1]}.name`] = unescapeTsString(m[2]);
  }
}

function extractExportedConstArrayLiteral(content: string, constName: string): string {
  const marker = `export const ${constName}`;
  const start = content.indexOf(marker);
  if (start === -1) return '';
  const after = content.slice(start);
  const eq = after.indexOf('=');
  if (eq === -1) return '';
  const bracket = after.indexOf('[', eq + 1);
  if (bracket === -1) return '';
  const abs = start + bracket;
  let depth = 0;
  for (let i = abs; i < content.length; i++) {
    const ch = content[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return content.slice(abs, i + 1);
    }
  }
  return '';
}

function mergeStoryArrayBlock(arrayLiteral: string, bundleId: string, out: Record<string, string>): void {
  const sceneRe =
    /id:\s*'([^']+)'\s*,[\s\r\n]*background:[^,]+,[\s\r\n]*lines:\s*\[([\s\S]*?)\]\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = sceneRe.exec(arrayLiteral)) !== null) {
    const sceneId = m[1];
    const inner = m[2];
    const lines: string[] = [];
    const lineRe = /'((?:\\.|[^'\\])*)'/g;
    let lm: RegExpExecArray | null;
    while ((lm = lineRe.exec(inner)) !== null) {
      lines.push(unescapeTsString(lm[1]));
    }
    out[`story.${bundleId}.${sceneId}.text`] = lines.join('\n');
  }
}

function buildLocaleObject(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ja)) {
    out[k] = v;
  }
  for (const a of ACHIEVEMENTS) {
    out[`achievement.${a.id}.name`] = a.name;
    out[`achievement.${a.id}.description`] = a.description;
  }
  mergeCardEventOmamoriFromDataFiles(out);
  mergeBuiltinEnemies(out);
  mergeTemplateEnemies(readFileSync(join(root, 'src', 'data', 'runData.ts'), 'utf8'), out);
  mergeTemplateEnemies(readFileSync(join(root, 'src', 'data', 'cookEnemies.ts'), 'utf8'), out);

  const carpenterStory = readFileSync(join(root, 'src', 'data', 'stories', 'carpenterStory.ts'), 'utf8');
  const cookStory = readFileSync(join(root, 'src', 'data', 'stories', 'cookStory.ts'), 'utf8');
  const carpBundles: [string, string][] = [
    ['carpenter_opening', 'CARPENTER_STORY'],
    ['carpenter_e1', 'CARPENTER_E1_STORY'],
    ['carpenter_e2', 'CARPENTER_E2_STORY'],
    ['carpenter_e3', 'CARPENTER_E3_STORY'],
  ];
  for (const [bid, cname] of carpBundles) {
    const block = extractExportedConstArrayLiteral(carpenterStory, cname);
    if (block) mergeStoryArrayBlock(block, bid, out);
  }
  const cookBundles: [string, string][] = [
    ['cook_opening', 'COOK_STORY'],
    ['cook_e1', 'COOK_E1_STORY'],
    ['cook_e2', 'COOK_E2_STORY'],
    ['cook_e3', 'COOK_E3_STORY'],
  ];
  for (const [bid, cname] of cookBundles) {
    const block = extractExportedConstArrayLiteral(cookStory, cname);
    if (block) mergeStoryArrayBlock(block, bid, out);
  }

  return out;
}

const outDir = join(root, 'public', 'locales');
mkdirSync(outDir, { recursive: true });
const bundle = buildLocaleObject();
const json = JSON.stringify(bundle);
writeFileSync(join(outDir, 'en.json'), json, 'utf8');
writeFileSync(join(outDir, 'ko.json'), json, 'utf8');
console.log(`Wrote public/locales/en.json & ko.json (${Object.keys(bundle).length} keys)`);
