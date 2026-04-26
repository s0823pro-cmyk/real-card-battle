import { containsNgWord } from "./ngWords";

const ALLOWED_JOB_IDS = new Set(["carpenter", "cook", "unemployed"]);

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

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
