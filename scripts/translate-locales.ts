/**
 * public/locales/en.json / ko.json のうち、値が日本語のままのキーを Claude API で翻訳して上書きする。
 *
 * 必要: 環境変数 ANTHROPIC_API_KEY
 * 実行: npm run translate:locales
 *
 * 途中停止後は再実行で続きから（既に日本語を含まない値のキーはスキップ）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const EN_PATH = join(root, 'public/locales/en.json');
const KO_PATH = join(root, 'public/locales/ko.json');

const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 50;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** ひらがな・カタカナ・漢字等（ロケール値が日本語かどうかの目安） */
function containsJapanese(s: string): boolean {
	if (!s) return false;
	return /[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(s);
}

type FlatJson = Record<string, string>;

function loadJson(path: string): FlatJson {
	const raw = readFileSync(path, 'utf8');
	const data = JSON.parse(raw) as unknown;
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error(`Invalid JSON object: ${path}`);
	}
	const out: FlatJson = {};
	for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
		if (typeof v === 'string') out[k] = v;
	}
	return out;
}

function writeJson(path: string, obj: FlatJson): void {
	const keys = Object.keys(obj).sort();
	const sorted: FlatJson = {};
	for (const k of keys) sorted[k] = obj[k];
	writeFileSync(path, `${JSON.stringify(sorted)}\n`, 'utf8');
}

/**
 * レスポンスから ```json / ``` を除去（先頭・末尾・文中のフェンスに対応）。
 */
function stripAllCodeFences(text: string): string {
	let t = text.trim();
	t = t.replace(/^```(?:json)?\s*\r?\n?/i, '');
	t = t.replace(/\r?\n?```\s*$/i, '');
	t = t.replace(/```(?:json)?\s*/gi, '');
	t = t.replace(/```/g, '');
	return t.trim();
}

/**
 * 最初の `{` から対応する `}` まで（文字列内の括弧は無視）を抽出。
 */
function extractBalancedJsonObject(text: string): string | null {
	const start = text.indexOf('{');
	if (start === -1) return null;
	let depth = 0;
	let inString = false;
	let escape = false;
	for (let i = start; i < text.length; i++) {
		const c = text[i];
		if (inString) {
			if (escape) {
				escape = false;
			} else if (c === '\\') {
				escape = true;
			} else if (c === '"') {
				inString = false;
			}
		} else if (c === '"') {
			inString = true;
		} else if (c === '{') {
			depth++;
		} else if (c === '}') {
			depth--;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return null;
}

function tryParseJsonObject(s: string): Record<string, unknown> | null {
	const trimmed = s.trim();
	if (!trimmed) return null;
	try {
		const p = JSON.parse(trimmed);
		if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
	} catch {
		return null;
	}
	return null;
}

/**
 * モデル応答テキストから翻訳オブジェクトを取り出す。
 * 1) フェンス除去後に JSON.parse
 * 2) 失敗時はバランスした `{...}` を抽出して parse
 */
function parseModelTranslations(rawText: string): Record<string, unknown> | null {
	const afterFences = stripAllCodeFences(rawText);
	const direct = tryParseJsonObject(afterFences);
	if (direct) return direct;

	const balanced = extractBalancedJsonObject(afterFences) ?? extractBalancedJsonObject(rawText);
	if (balanced) {
		const nested = tryParseJsonObject(balanced);
		if (nested) return nested;
	}

	return null;
}

function mergeTranslations(
	parsed: Record<string, unknown>,
	expectedKeys: string[],
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const key of expectedKeys) {
		const v = parsed[key];
		if (typeof v === 'string') out[key] = v;
		else console.warn(`  [warn] missing or non-string for key: ${key}`);
	}
	return out;
}

type TranslateBatchResult =
	| { ok: true; translations: Record<string, string> }
	| { ok: false; reason: string };

async function translateBatch(
	items: Record<string, string>,
	target: 'en' | 'ko',
): Promise<TranslateBatchResult> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey?.trim()) {
		return { ok: false, reason: 'ANTHROPIC_API_KEY が未設定' };
	}

	const targetLabel = target === 'en' ? 'English' : 'Korean (한국어)';
	const inputJson = JSON.stringify(items, null, 2);
	const expectedKeys = Object.keys(items);

	const userMessage = [
		`You are localizing a Japanese mobile card-battle game (jobs: carpenter/大工, cook/料理人, unemployed/無職).`,
		`Translate every string value to natural ${targetLabel} suitable for in-game UI.`,
		`Rules:`,
		`- Preserve placeholders exactly: {n}, {job}, {rank}, {area}, {floor}, {total}, {names}, {label}, {cost}, {price}, {gold}, {name}, {state}, {before}, {after}, {suffix}, etc.`,
		`- Keep emoji and symbols (e.g. ←, 🔨, ⛩️) unless they are clearly part of Japanese prose to localize.`,
		`- Card/skill names: localize as game terms, not literal dictionary entries when a short UI label fits better.`,
		`- Return ONLY a single JSON object: keys are the same as input keys, values are translated strings. No markdown, no commentary.`,
		`Input keys and Japanese source strings:`,
		inputJson,
	].join('\n');

	const res = await fetch(ANTHROPIC_URL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey.trim(),
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 16384,
			messages: [{ role: 'user', content: userMessage }],
		}),
	});

	if (!res.ok) {
		const errBody = await res.text();
		return { ok: false, reason: `HTTP ${res.status}: ${errBody.slice(0, 400)}` };
	}

	const data = (await res.json()) as {
		content?: { type: string; text?: string }[];
	};
	const block = data.content?.find((c) => c.type === 'text');
	const rawText = block?.text ?? '';
	if (!rawText.trim()) {
		return { ok: false, reason: 'API returned empty content' };
	}

	const parsed = parseModelTranslations(rawText);
	if (!parsed) {
		return {
			ok: false,
			reason: `JSON parse failed after fence strip + brace extract. Preview:\n${rawText.slice(0, 500)}`,
		};
	}

	const translations = mergeTranslations(parsed, expectedKeys);
	if (Object.keys(translations).length === 0) {
		return { ok: false, reason: 'No valid string values in parsed object for this batch' };
	}

	return { ok: true, translations };
}

function chunkKeys(keys: string[], size: number): string[][] {
	const chunks: string[][] = [];
	for (let i = 0; i < keys.length; i += size) {
		chunks.push(keys.slice(i, i + size));
	}
	return chunks;
}

async function run(): Promise<void> {
	let en = loadJson(EN_PATH);
	let ko = loadJson(KO_PATH);

	const allKeys = new Set([...Object.keys(en), ...Object.keys(ko)]);

	/** 再実行時: 値に日本語が含まれないキーはスキップ（翻訳済み扱い） */
	const keysNeedingEn = [...allKeys].filter((k) => containsJapanese(en[k] ?? ''));
	const keysNeedingKo = [...allKeys].filter((k) => containsJapanese(ko[k] ?? ''));

	console.log(`Model: ${MODEL}`);
	console.log(`Keys still needing EN (Japanese in value): ${keysNeedingEn.length}`);
	console.log(`Keys still needing KO (Japanese in value): ${keysNeedingKo.length}`);

	if (keysNeedingEn.length === 0 && keysNeedingKo.length === 0) {
		console.log('Nothing to translate (no Japanese in values).');
		return;
	}

	const enBatches = chunkKeys(keysNeedingEn, BATCH_SIZE);
	const koBatches = chunkKeys(keysNeedingKo, BATCH_SIZE);

	for (let bi = 0; bi < enBatches.length; bi++) {
		const batch = enBatches[bi]!;
		const items: Record<string, string> = {};
		for (const k of batch) {
			items[k] = en[k] ?? ko[k] ?? '';
		}
		console.log(`[EN] batch ${bi + 1}/${enBatches.length} (${batch.length} keys) …`);
		const result = await translateBatch(items, 'en');
		if (!result.ok) {
			console.error(`[EN] SKIP batch ${bi + 1}/${enBatches.length}: ${result.reason}`);
		} else {
			en = { ...en, ...result.translations };
			writeJson(EN_PATH, en);
			console.log(`[EN] batch ${bi + 1}/${enBatches.length} saved (${Object.keys(result.translations).length} keys)`);
		}
		await new Promise((r) => setTimeout(r, 400));
	}

	for (let bi = 0; bi < koBatches.length; bi++) {
		const batch = koBatches[bi]!;
		const items: Record<string, string> = {};
		for (const k of batch) {
			items[k] = ko[k] ?? en[k] ?? '';
		}
		console.log(`[KO] batch ${bi + 1}/${koBatches.length} (${batch.length} keys) …`);
		const result = await translateBatch(items, 'ko');
		if (!result.ok) {
			console.error(`[KO] SKIP batch ${bi + 1}/${koBatches.length}: ${result.reason}`);
		} else {
			ko = { ...ko, ...result.translations };
			writeJson(KO_PATH, ko);
			console.log(`[KO] batch ${bi + 1}/${koBatches.length} saved (${Object.keys(result.translations).length} keys)`);
		}
		await new Promise((r) => setTimeout(r, 400));
	}

	console.log(`Done. ${EN_PATH} / ${KO_PATH}`);
}

run().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
