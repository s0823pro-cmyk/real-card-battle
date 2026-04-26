import { containsNgWord } from "./ngWords";

const ALLOWED_JOB_IDS = new Set(["carpenter", "cook", "unemployed"]);

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const BATCH_SIZE = 80;
const MAX_ID_MAP_ENTRIES = 500;
const MAX_ID_LEN = 128;

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...CORS_HEADERS,
		},
	});
}

function empty(status: number): Response {
	return new Response(null, { status, headers: { ...CORS_HEADERS } });
}

function nicknameCharLength(s: string): number {
	return [...s].length;
}

function isNonEmptyDeviceId(id: unknown): id is string {
	return typeof id === "string" && id.trim().length > 0 && id.length <= 512;
}

async function runBatches(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
	for (let i = 0; i < statements.length; i += BATCH_SIZE) {
		await db.batch(statements.slice(i, i + BATCH_SIZE));
	}
}

/** cards_used / enemies_killed: string id -> non-negative integer count */
function parseIdCountMap(v: unknown): Record<string, number> | null {
	if (!v || typeof v !== "object" || Array.isArray(v)) return null;
	const out: Record<string, number> = {};
	let n = 0;
	for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
		if (n >= MAX_ID_MAP_ENTRIES) return null;
		if (typeof k !== "string" || k.length === 0 || k.length > MAX_ID_LEN) return null;
		if (typeof val !== "number" || !Number.isFinite(val)) return null;
		const c = Math.trunc(val);
		if (c < 0 || c > 1_000_000) return null;
		if (c > 0) out[k] = c;
		n++;
	}
	return out;
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname.replace(/\/+$/, "") || "/";
		const method = request.method;

		if (method === "OPTIONS") {
			return empty(204);
		}

		try {
			if (path === "/nickname" && method === "POST") {
				return await handlePostNickname(request, env);
			}
			if (path === "/score" && method === "POST") {
				return await handlePostScore(request, env);
			}
			if (path === "/stats" && method === "POST") {
				return await handlePostStats(request, env);
			}
			if (path === "/code" && method === "POST") {
				return await handlePostCode(request, env);
			}
			if (path === "/admin/summary" && method === "GET") {
				return await handleGetAdminSummary(request, env);
			}
			if (path.startsWith("/ranking/") && method === "GET") {
				const jobId = decodeURIComponent(path.slice("/ranking/".length));
				return await handleGetRanking(env, jobId);
			}
			if (path.startsWith("/nickname/") && method === "GET") {
				const deviceId = decodeURIComponent(path.slice("/nickname/".length));
				return await handleGetNickname(env, deviceId);
			}
		} catch (e) {
			console.error(e);
			return json({ ok: false, error: "internal_error" }, 500);
		}

		return json({ error: "not_found" }, 404);
	},
} satisfies ExportedHandler<Env>;

async function handlePostNickname(request: Request, env: Env): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: "invalid_json" }, 400);
	}
	if (!body || typeof body !== "object") {
		return json({ ok: false, error: "invalid_body" }, 400);
	}
	const { device_id, nickname } = body as Record<string, unknown>;
	if (!isNonEmptyDeviceId(device_id)) {
		return json({ ok: false, error: "invalid_device_id" }, 400);
	}
	if (typeof nickname !== "string") {
		return json({ ok: false, error: "invalid_nickname" }, 400);
	}
	const trimmed = nickname.trim();
	const len = nicknameCharLength(trimmed);
	if (len < 2 || len > 12) {
		return json({ ok: false, error: "nickname_length" }, 400);
	}
	if (containsNgWord(trimmed)) {
		return json({ ok: false, error: "nickname_not_allowed" }, 400);
	}

	const now = Date.now();
	await env.DB.prepare(
		`INSERT INTO players (device_id, nickname, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET nickname = excluded.nickname`,
	)
		.bind(device_id, trimmed, now)
		.run();

	return json({ ok: true });
}

async function handleGetRanking(env: Env, jobId: string): Promise<Response> {
	if (!ALLOWED_JOB_IDS.has(jobId)) {
		return json({ error: "invalid_job_id" }, 400);
	}

	const { results } = await env.DB.prepare(
		`SELECT p.nickname AS nickname, s.score AS score
     FROM scores s
     INNER JOIN players p ON p.device_id = s.device_id
     WHERE s.job_id = ?
     ORDER BY s.score DESC, s.updated_at ASC
     LIMIT 100`,
	)
		.bind(jobId)
		.all<{ nickname: string; score: number }>();

	const ranking = (results ?? []).map((row, i) => ({
		rank: i + 1,
		nickname: row.nickname,
		score: row.score,
	}));

	return json({ ranking });
}

async function handlePostScore(request: Request, env: Env): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, score: 0 }, 400);
	}
	if (!body || typeof body !== "object") {
		return json({ ok: false, score: 0 }, 400);
	}
	const { device_id, job_id, points } = body as Record<string, unknown>;
	if (!isNonEmptyDeviceId(device_id) || typeof job_id !== "string" || job_id.length === 0 || job_id.length > 64) {
		return json({ ok: false, score: 0 }, 400);
	}
	if (typeof points !== "number" || !Number.isFinite(points)) {
		return json({ ok: false, score: 0 }, 400);
	}
	const add = Math.trunc(points);
	if (add < 0 || add > 1_000_000_000) {
		return json({ ok: false, score: 0 }, 400);
	}

	const exists = await env.DB.prepare(`SELECT 1 AS x FROM players WHERE device_id = ? LIMIT 1`)
		.bind(device_id)
		.first<{ x: number }>();
	if (!exists) {
		return json({ ok: false, score: 0 });
	}

	const now = Date.now();
	const row = await env.DB.prepare(
		`INSERT INTO scores (device_id, job_id, score, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(device_id, job_id) DO UPDATE SET
       score = MAX(scores.score, excluded.score),
       updated_at = CASE
         WHEN excluded.score > scores.score THEN excluded.updated_at
         ELSE scores.updated_at
       END
     RETURNING score`,
	)
		.bind(device_id, job_id, add, now)
		.first<{ score: number }>();

	const score = row?.score ?? 0;
	return json({ ok: true, score });
}

async function handleGetNickname(env: Env, deviceId: string): Promise<Response> {
	if (!deviceId || deviceId.length > 512) {
		return json({ nickname: null });
	}
	const row = await env.DB.prepare(`SELECT nickname FROM players WHERE device_id = ? LIMIT 1`)
		.bind(deviceId)
		.first<{ nickname: string }>();
	return json({ nickname: row?.nickname ?? null });
}

async function handlePostStats(request: Request, env: Env): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: "invalid_json" }, 400);
	}
	if (!body || typeof body !== "object") {
		return json({ ok: false, error: "invalid_body" }, 400);
	}
	const b = body as Record<string, unknown>;
	const { device_id, job_id, outcome, kills, gold, cards_used, enemies_killed, win_streak } = b;

	if (!isNonEmptyDeviceId(device_id)) {
		return json({ ok: false, error: "invalid_device_id" }, 400);
	}
	if (typeof job_id !== "string" || !ALLOWED_JOB_IDS.has(job_id)) {
		return json({ ok: false, error: "invalid_job_id" }, 400);
	}
	if (outcome !== "victory" && outcome !== "defeat") {
		return json({ ok: false, error: "invalid_outcome" }, 400);
	}
	if (typeof kills !== "number" || !Number.isFinite(kills)) {
		return json({ ok: false, error: "invalid_kills" }, 400);
	}
	if (typeof gold !== "number" || !Number.isFinite(gold)) {
		return json({ ok: false, error: "invalid_gold" }, 400);
	}
	if (typeof win_streak !== "number" || !Number.isFinite(win_streak)) {
		return json({ ok: false, error: "invalid_win_streak" }, 400);
	}

	const killsN = Math.max(0, Math.min(1_000_000_000, Math.trunc(kills)));
	const goldN = Math.max(0, Math.min(1_000_000_000, Math.trunc(gold)));
	const streakN = Math.max(0, Math.min(1_000_000, Math.trunc(win_streak)));

	const cardsMap = parseIdCountMap(cards_used);
	const enemiesMap = parseIdCountMap(enemies_killed);
	if (cardsMap === null) return json({ ok: false, error: "invalid_cards_used" }, 400);
	if (enemiesMap === null) return json({ ok: false, error: "invalid_enemies_killed" }, 400);

	const exists = await env.DB.prepare(`SELECT 1 AS x FROM players WHERE device_id = ? LIMIT 1`)
		.bind(device_id)
		.first<{ x: number }>();
	if (!exists) {
		return json({ ok: false, error: "unknown_device" }, 400);
	}

	const winInc = outcome === "victory" ? 1 : 0;
	const defInc = outcome === "defeat" ? 1 : 0;
	const now = Date.now();

	await env.DB.prepare(
		`INSERT INTO player_stats (device_id, job_id, play_count, win_count, defeat_count, total_kills, total_gold, max_win_streak, updated_at)
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id, job_id) DO UPDATE SET
       play_count = player_stats.play_count + 1,
       win_count = player_stats.win_count + excluded.win_count,
       defeat_count = player_stats.defeat_count + excluded.defeat_count,
       total_kills = player_stats.total_kills + excluded.total_kills,
       total_gold = player_stats.total_gold + excluded.total_gold,
       max_win_streak = MAX(player_stats.max_win_streak, excluded.max_win_streak),
       updated_at = excluded.updated_at`,
	)
		.bind(device_id, job_id, winInc, defInc, killsN, goldN, streakN, now)
		.run();

	const cardStmts: D1PreparedStatement[] = [];
	for (const [cardId, delta] of Object.entries(cardsMap)) {
		cardStmts.push(
			env.DB.prepare(
				`INSERT INTO card_usage (device_id, card_id, use_count)
         VALUES (?, ?, ?)
         ON CONFLICT(device_id, card_id) DO UPDATE SET
           use_count = card_usage.use_count + excluded.use_count`,
			).bind(device_id, cardId, delta),
		);
	}
	await runBatches(env.DB, cardStmts);

	const enemyStmts: D1PreparedStatement[] = [];
	for (const [enemyId, delta] of Object.entries(enemiesMap)) {
		enemyStmts.push(
			env.DB.prepare(
				`INSERT INTO enemy_kills (device_id, enemy_id, kill_count)
         VALUES (?, ?, ?)
         ON CONFLICT(device_id, enemy_id) DO UPDATE SET
           kill_count = enemy_kills.kill_count + excluded.kill_count`,
			).bind(device_id, enemyId, delta),
		);
	}
	await runBatches(env.DB, enemyStmts);

	return json({ ok: true });
}

async function handlePostCode(request: Request, env: Env): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: "invalid_json" }, 400);
	}
	if (!body || typeof body !== "object") {
		return json({ ok: false, error: "invalid_body" }, 400);
	}
	const codeRaw = (body as Record<string, unknown>).code;
	if (typeof codeRaw !== "string") {
		return json({ ok: false, error: "invalid_code" }, 400);
	}
	const code = codeRaw.trim();
	if (code.length === 0 || code.length > 128) {
		return json({ ok: false, error: "invalid_code" }, 400);
	}

	const row = await env.DB.prepare(`SELECT type, payload FROM codes WHERE code = ? LIMIT 1`)
		.bind(code)
		.first<{ type: string; payload: string | null }>();
	if (!row || (row.type !== "admin" && row.type !== "gift")) {
		return json({ ok: false, error: "invalid_code" }, 400);
	}

	let payload: unknown = null;
	if (row.payload != null && row.payload !== "") {
		try {
			payload = JSON.parse(row.payload) as unknown;
		} catch {
			payload = row.payload;
		}
	}

	return json({ ok: true, type: row.type, payload });
}

async function handleGetAdminSummary(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code")?.trim() ?? "";
	if (code.length === 0 || code.length > 128) {
		return json({ error: "unauthorized" }, 401);
	}

	const ok = await env.DB.prepare(`SELECT 1 AS x FROM codes WHERE code = ? AND type = 'admin' LIMIT 1`)
		.bind(code)
		.first<{ x: number }>();
	if (!ok) {
		return json({ error: "unauthorized" }, 401);
	}

	const totalPlayersRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM players`).first<{ n: number }>();
	const totalPlayers = totalPlayersRow?.n ?? 0;

	const aggRow = await env.DB.prepare(
		`SELECT
       COALESCE(SUM(play_count), 0) AS total_plays,
       COALESCE(SUM(win_count), 0) AS total_victories,
       COALESCE(SUM(defeat_count), 0) AS total_defeats,
       COALESCE(SUM(total_gold), 0) AS sum_gold
     FROM player_stats`,
	).first<{
		total_plays: number;
		total_victories: number;
		total_defeats: number;
		sum_gold: number;
	}>();

	const sumPlays = aggRow?.total_plays ?? 0;
	const avgGoldPerPlay = sumPlays > 0 ? (aggRow?.sum_gold ?? 0) / sumPlays : 0;

	const { results: jobRows } = await env.DB.prepare(
		`SELECT job_id, SUM(play_count) AS play_count, SUM(win_count) AS win_count, SUM(defeat_count) AS defeat_count
     FROM player_stats
     GROUP BY job_id`,
	).all<{ job_id: string; play_count: number; win_count: number; defeat_count: number }>();

	const { results: topCards } = await env.DB.prepare(
		`SELECT card_id, SUM(use_count) AS total_use_count
     FROM card_usage
     GROUP BY card_id
     ORDER BY total_use_count DESC
     LIMIT 20`,
	).all<{ card_id: string; total_use_count: number }>();

	const { results: topEnemies } = await env.DB.prepare(
		`SELECT enemy_id, SUM(kill_count) AS total_kill_count
     FROM enemy_kills
     GROUP BY enemy_id
     ORDER BY total_kill_count DESC
     LIMIT 20`,
	).all<{ enemy_id: string; total_kill_count: number }>();

	return json({
		total_players: totalPlayers,
		total_plays: sumPlays,
		total_victories: aggRow?.total_victories ?? 0,
		total_defeats: aggRow?.total_defeats ?? 0,
		job_stats: (jobRows ?? []).map((r) => ({
			job_id: r.job_id,
			play_count: r.play_count,
			win_count: r.win_count,
			defeat_count: r.defeat_count,
		})),
		top_cards: (topCards ?? []).map((r) => ({
			card_id: r.card_id,
			total_use_count: r.total_use_count,
		})),
		top_enemies: (topEnemies ?? []).map((r) => ({
			enemy_id: r.enemy_id,
			total_kill_count: r.total_kill_count,
		})),
		avg_gold_per_play: avgGoldPerPlay,
	});
}
