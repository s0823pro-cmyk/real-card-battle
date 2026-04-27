import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { beforeEach, describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function ensureSchema(): Promise<void> {
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS players (
      device_id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS scores (
      device_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (device_id, job_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS player_stats (
      device_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      play_count INTEGER NOT NULL DEFAULT 0,
      win_count INTEGER NOT NULL DEFAULT 0,
      defeat_count INTEGER NOT NULL DEFAULT 0,
      total_kills INTEGER NOT NULL DEFAULT 0,
      total_gold INTEGER NOT NULL DEFAULT 0,
      max_win_streak INTEGER NOT NULL DEFAULT 0,
      total_play_time INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (device_id, job_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS card_usage (
      device_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      use_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (device_id, card_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS enemy_kills (
      device_id TEXT NOT NULL,
      enemy_id TEXT NOT NULL,
      kill_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (device_id, enemy_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS area_stats (
      device_id TEXT NOT NULL,
      area INTEGER NOT NULL,
      reached_count INTEGER NOT NULL DEFAULT 0,
      cleared_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (device_id, area)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS card_combos (
      combo_key TEXT NOT NULL,
      use_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (combo_key)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS codes (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(
		`INSERT OR IGNORE INTO codes (code, type, payload, created_at)
     VALUES ('JOBLESS_ADMIN_2024', 'admin', NULL, 0)`,
	).run();
}

describe("ranking worker", () => {
	beforeEach(async () => {
		await ensureSchema();
	});

	it("OPTIONS returns 204 with CORS", async () => {
		const request = new IncomingRequest("http://example.com/nickname", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("GET / returns 404 JSON", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "not_found" });
	});

	it("POST /nickname then GET /nickname and POST /score and GET /ranking", async () => {
		const device = "test-device-1";
		const postNick = new IncomingRequest("http://example.com/nickname", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, nickname: "プレイヤー" }),
		});
		const ctx = createExecutionContext();
		let res = await worker.fetch(postNick, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });

		const getNick = new IncomingRequest(`http://example.com/nickname/${encodeURIComponent(device)}`);
		res = await worker.fetch(getNick, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ nickname: "プレイヤー" });

		const postScore = new IncomingRequest("http://example.com/score", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, job_id: "cook", points: 10 }),
		});
		res = await worker.fetch(postScore, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 10 });

		const postScore2 = new IncomingRequest("http://example.com/score", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, job_id: "cook", points: 5 }),
		});
		res = await worker.fetch(postScore2, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 10 });

		const postScore3 = new IncomingRequest("http://example.com/score", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, job_id: "cook", points: 20 }),
		});
		res = await worker.fetch(postScore3, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 20 });

		const rankingReq = new IncomingRequest("http://example.com/ranking/cook");
		res = await worker.fetch(rankingReq, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = (await res.json()) as {
			ranking: { rank: number; nickname: string; score: number }[];
		};
		expect(body.ranking.length).toBeGreaterThanOrEqual(1);
		expect(body.ranking[0]).toMatchObject({ rank: 1, nickname: "プレイヤー", score: 20 });
	});

	it("POST /nickname rejects duplicate nickname for another device", async () => {
		const ctx = createExecutionContext();
		const first = new IncomingRequest("http://example.com/nickname", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: "dev-a", nickname: "共有太郎" }),
		});
		let res = await worker.fetch(first, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });

		const second = new IncomingRequest("http://example.com/nickname", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: "dev-b", nickname: "共有太郎" }),
		});
		res = await worker.fetch(second, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ ok: false, error: "nickname_taken" });
	});

	it("POST /nickname allows same device to resubmit same nickname", async () => {
		const ctx = createExecutionContext();
		const body = JSON.stringify({ device_id: "dev-resubmit", nickname: "再登録" });
		const req = () =>
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
			});
		let res = await worker.fetch(req(), env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });

		res = await worker.fetch(req(), env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it("POST /score ignores unknown device_id", async () => {
		const postScore = new IncomingRequest("http://example.com/score", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: "no-such-device", job_id: "cook", points: 99 }),
		});
		const ctx = createExecutionContext();
		const res = await worker.fetch(postScore, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: false, score: 0 });
	});

	it("SELF.fetch integration smoke", async () => {
		const response = await SELF.fetch("http://example.com/ranking/carpenter");
		expect(response.status).toBe(200);
		const body = (await response.json()) as { ranking: unknown[] };
		expect(Array.isArray(body.ranking)).toBe(true);
	});

	it("POST /stats upserts player_stats and card_usage", async () => {
		const device = "stats-device-1";
		const postNick = new IncomingRequest("http://example.com/nickname", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, nickname: "統計" }),
		});
		const ctx = createExecutionContext();
		let res = await worker.fetch(postNick, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		const postStats = new IncomingRequest("http://example.com/stats", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				device_id: device,
				job_id: "carpenter",
				outcome: "victory",
				kills: 2,
				gold: 50,
				cards_used: { hammer_strike: 3 },
				enemies_killed: { wildCat: 1 },
				win_streak: 2,
				play_time_seconds: 90,
				area_reached: 1,
				area_cleared: true,
				top_cards: ["hammer_strike", "dodge", "focus"],
			}),
		});
		res = await worker.fetch(postStats, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });

		const row = await env.DB.prepare(
			`SELECT play_count, win_count, defeat_count, total_kills, total_gold, max_win_streak, total_play_time FROM player_stats WHERE device_id = ? AND job_id = ?`,
		)
			.bind(device, "carpenter")
			.first<{
				play_count: number;
				win_count: number;
				defeat_count: number;
				total_kills: number;
				total_gold: number;
				max_win_streak: number;
				total_play_time: number;
			}>();
		expect(row).toMatchObject({
			play_count: 1,
			win_count: 1,
			defeat_count: 0,
			total_kills: 2,
			total_gold: 50,
			max_win_streak: 2,
			total_play_time: 90,
		});

		const areaRow = await env.DB.prepare(
			`SELECT reached_count, cleared_count FROM area_stats WHERE device_id = ? AND area = ?`,
		)
			.bind(device, 1)
			.first<{ reached_count: number; cleared_count: number }>();
		expect(areaRow).toEqual({ reached_count: 1, cleared_count: 1 });

		const { results: comboList } = await env.DB.prepare(
			`SELECT combo_key, use_count FROM card_combos ORDER BY combo_key`,
		).all<{ combo_key: string; use_count: number }>();
		const keys = new Set((comboList ?? []).map((r) => r.combo_key));
		expect(keys.has("dodge|hammer_strike")).toBe(true);
		expect(keys.has("focus|hammer_strike")).toBe(true);
		expect(keys.has("dodge|focus")).toBe(true);
		for (const r of comboList ?? []) {
			expect(r.use_count).toBe(1);
		}
	});

	it("GET /my-stats aggregates by device_id", async () => {
		const device = "my-stats-device-1";
		const postNick = new IncomingRequest("http://example.com/nickname", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ device_id: device, nickname: "マイ統計" }),
		});
		const ctx = createExecutionContext();
		let res = await worker.fetch(postNick, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		const postStats = new IncomingRequest("http://example.com/stats", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				device_id: device,
				job_id: "carpenter",
				outcome: "victory",
				kills: 2,
				gold: 50,
				cards_used: { hammer_strike: 3, dodge: 1 },
				enemies_killed: { wildCat: 1 },
				win_streak: 1,
				play_time_seconds: 60,
				area_reached: 1,
				area_cleared: false,
				top_cards: ["hammer_strike", "dodge"],
			}),
		});
		res = await worker.fetch(postStats, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		const getMy = new IncomingRequest(
			`http://example.com/my-stats?device_id=${encodeURIComponent(device)}`,
		);
		res = await worker.fetch(getMy, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			total_plays: number;
			total_wins: number;
			total_defeats: number;
			total_gold: number;
			avg_play_time_seconds: number;
			job_stats: { job_id: string; play_count: number; win_count: number }[];
			top_cards: { card_id: string; use_count: number }[];
			top_enemies: { enemy_id: string; kill_count: number }[];
		};
		expect(body.total_plays).toBe(1);
		expect(body.total_wins).toBe(1);
		expect(body.total_defeats).toBe(0);
		expect(body.total_gold).toBe(50);
		expect(body.avg_play_time_seconds).toBe(60);
		expect(body.job_stats).toHaveLength(2);
		const carpenter = body.job_stats.find((j) => j.job_id === "carpenter");
		expect(carpenter?.play_count).toBe(1);
		expect(carpenter?.win_count).toBe(1);
		expect(body.top_cards[0]?.card_id).toBe("hammer_strike");
		expect(body.top_cards[0]?.use_count).toBe(3);
		expect(body.top_enemies[0]?.enemy_id).toBe("wildCat");
		expect(body.top_enemies[0]?.kill_count).toBe(1);
	});

	it("GET /my-stats returns 400 for empty device_id", async () => {
		const req = new IncomingRequest("http://example.com/my-stats?device_id=");
		const ctx = createExecutionContext();
		const res = await worker.fetch(req, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(400);
	});

	it("POST /code and GET /admin/summary with admin code", async () => {
		const postCode = new IncomingRequest("http://example.com/code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code: "JOBLESS_ADMIN_2024" }),
		});
		const ctx = createExecutionContext();
		let res = await worker.fetch(postCode, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const codeBody = (await res.json()) as { ok: boolean; type: string; payload: unknown };
		expect(codeBody.ok).toBe(true);
		expect(codeBody.type).toBe("admin");

		const summaryReq = new IncomingRequest(
			"http://example.com/admin/summary?code=" + encodeURIComponent("JOBLESS_ADMIN_2024"),
		);
		res = await worker.fetch(summaryReq, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const sum = (await res.json()) as {
			total_players: number;
			total_plays: number;
			job_stats: unknown[];
			top_cards: unknown[];
			top_enemies: unknown[];
			avg_gold_per_play: number;
			avg_play_time_seconds?: number;
			area_stats?: unknown[];
			top_combos?: unknown[];
		};
		expect(typeof sum.total_players).toBe("number");
		expect(Array.isArray(sum.job_stats)).toBe(true);
		expect(typeof sum.avg_play_time_seconds).toBe("number");
		expect(Array.isArray(sum.area_stats)).toBe(true);
		expect(Array.isArray(sum.top_combos)).toBe(true);
	});
});
