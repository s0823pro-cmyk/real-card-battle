import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { beforeEach, describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const ACTIVE_RANKING_TEST_NOW = String(Date.UTC(2026, 5, 1, 15, 0, 0));
const TEST_ADMIN_CODE = "TEST_ADMIN_CODE";
const LEGACY_ADMIN_CODE = "JOBLESS_ADMIN_2024";

function setActiveRankingTestNow(): void {
	(env as unknown as Record<string, unknown>).RANKING_TEST_NOW = ACTIVE_RANKING_TEST_NOW;
	(env as unknown as Record<string, unknown>).ADMIN_CODE = TEST_ADMIN_CODE;
	(env as unknown as Record<string, unknown>).APPLE_TEST_IDENTITY_TOKEN = "test.apple.identity.token";
	(env as unknown as Record<string, unknown>).APPLE_TEST_SUB = "apple-user-test-1";
}

async function ensureSchema(): Promise<void> {
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS players (
      device_id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      nickname_season_id TEXT NOT NULL DEFAULT 'legacy',
      selected_badge TEXT,
      created_at INTEGER NOT NULL
    )`,
	).run();
	try {
		await env.DB.prepare(`ALTER TABLE players ADD COLUMN selected_badge TEXT`).run();
	} catch {
		// 既に追加済みなら何もしない
	}
	try {
		await env.DB.prepare(`ALTER TABLE players ADD COLUMN nickname_season_id TEXT NOT NULL DEFAULT 'legacy'`).run();
	} catch {
		// 既に追加済みなら何もしない
	}
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS scores (
      device_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      season_id TEXT NOT NULL DEFAULT 'legacy',
      score INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (device_id, job_id)
    )`,
	).run();
	try {
		await env.DB.prepare(`ALTER TABLE scores ADD COLUMN season_id TEXT NOT NULL DEFAULT 'legacy'`).run();
	} catch {
		// 既に追加済みなら何もしない
	}
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS ranking_names (
      season_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (season_id, device_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_ranking_names_season_nickname
      ON ranking_names (season_id, nickname)`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS ranking_scores (
      season_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (season_id, device_id, job_id)
    )`,
	).run();
	await env.DB.prepare(
		`CREATE INDEX IF NOT EXISTS idx_ranking_scores_season_job_score
      ON ranking_scores (season_id, job_id, score DESC, updated_at ASC)`,
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
		`CREATE TABLE IF NOT EXISTS ranking_champions (
      season_id TEXT PRIMARY KEY,
      season_label TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      score INTEGER NOT NULL,
      awarded_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS player_champion_badges (
      device_id TEXT PRIMARY KEY,
      champion_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS apple_account_links (
      apple_user_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      linked_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(
		`CREATE INDEX IF NOT EXISTS idx_apple_account_links_device_id
      ON apple_account_links (device_id)`,
	).run();
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS apple_account_backups (
      apple_user_id TEXT PRIMARY KEY,
      backup_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
	).run();
	await env.DB.prepare(`DELETE FROM ranking_champions`).run();
	await env.DB.prepare(`DELETE FROM player_champion_badges`).run();
	await env.DB.prepare(`DELETE FROM apple_account_links`).run();
	await env.DB.prepare(`DELETE FROM apple_account_backups`).run();
}

describe("ranking worker", () => {
	beforeEach(async () => {
		setActiveRankingTestNow();
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
		expect(await res.json()).toMatchObject({ ok: true });

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
			ranking: { rank: number; nickname: string; selected_badge: string | null; score: number }[];
		};
		expect(body.ranking.length).toBeGreaterThanOrEqual(1);
		expect(body.ranking[0]).toMatchObject({ rank: 1, nickname: "プレイヤー", selected_badge: null, score: 20 });
	});

	it("keeps ranking nickname and score separated by season", async () => {
		const device = "season-device-1";
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, nickname: "初代名" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toMatchObject({ ok: true });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, job_id: "carpenter", points: 100 }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 100 });

		(env as unknown as Record<string, unknown>).RANKING_TEST_NOW = String(Date.UTC(2026, 5, 16, 15, 0, 0));
		res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, nickname: "二代目名" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toMatchObject({ ok: true });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, job_id: "carpenter", points: 200 }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 200 });

		res = await worker.fetch(new IncomingRequest("http://example.com/ranking/carpenter"), env, ctx);
		await waitOnExecutionContext(ctx);
		let rankingBody = (await res.json()) as { ranking: { nickname: string; score: number }[] };
		expect(rankingBody.ranking).toContainEqual(expect.objectContaining({ nickname: "二代目名", score: 200 }));
		expect(rankingBody.ranking).not.toContainEqual(expect.objectContaining({ nickname: "初代名", score: 100 }));

		setActiveRankingTestNow();
		res = await worker.fetch(new IncomingRequest("http://example.com/ranking/carpenter"), env, ctx);
		await waitOnExecutionContext(ctx);
		rankingBody = (await res.json()) as { ranking: { nickname: string; score: number }[] };
		expect(rankingBody.ranking).toContainEqual(expect.objectContaining({ nickname: "初代名", score: 100 }));
		expect(rankingBody.ranking).not.toContainEqual(expect.objectContaining({ nickname: "二代目名", score: 200 }));
	});

	it("POST /badge saves selected mastery badge for ranking rows", async () => {
		const device = "badge-device-1";
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, nickname: "バッジ持ち" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toMatchObject({ ok: true });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/badge", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, selected_badge: "courier:expert" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, selected_badge: "courier:expert" });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, job_id: "courier", points: 100 }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toEqual({ ok: true, score: 100 });

		res = await worker.fetch(new IncomingRequest("http://example.com/ranking/courier"), env, ctx);
		await waitOnExecutionContext(ctx);
		const body = (await res.json()) as {
			ranking: { rank: number; nickname: string; selected_badge: string | null; score: number }[];
		};
		expect(body.ranking[0]).toMatchObject({
			rank: 1,
			nickname: "バッジ持ち",
			selected_badge: "courier:expert",
			score: 100,
		});
	});

	it("POST /admin/confirm-champion fixes winner and exposes champion_count", async () => {
		const ctx = createExecutionContext();
		for (const [device, nickname, score] of [
			["champion-device-1", "覇者太郎", 900_000],
			["champion-device-2", "挑戦者", 700_000],
		] as const) {
			let res = await worker.fetch(
				new IncomingRequest("http://example.com/nickname", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ device_id: device, nickname }),
				}),
				env,
				ctx,
			);
			await waitOnExecutionContext(ctx);
			expect(await res.json()).toMatchObject({ ok: true });

			res = await worker.fetch(
				new IncomingRequest("http://example.com/score", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ device_id: device, job_id: "cook", points: score }),
				}),
				env,
				ctx,
			);
			await waitOnExecutionContext(ctx);
			expect(await res.json()).toMatchObject({ ok: true });
		}

		let res = await worker.fetch(
			new IncomingRequest("http://example.com/admin/confirm-champion", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: TEST_ADMIN_CODE }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ ok: false, error: "desktop_only" });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/admin/confirm-champion", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Jobless-Admin-Client": "desktop" },
				body: JSON.stringify({ code: TEST_ADMIN_CODE }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const confirmed = (await res.json()) as {
			ok: boolean;
			already_confirmed: boolean;
			champion: { nickname: string; champion_count: number };
		};
		expect(confirmed).toMatchObject({
			ok: true,
			already_confirmed: false,
			champion: { nickname: "覇者太郎", champion_count: 1 },
		});

		res = await worker.fetch(
			new IncomingRequest("http://example.com/admin/confirm-champion", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Jobless-Admin-Client": "desktop" },
				body: JSON.stringify({ code: TEST_ADMIN_CODE }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toMatchObject({
			ok: true,
			already_confirmed: true,
			champion: { nickname: "覇者太郎", champion_count: 1 },
		});

		res = await worker.fetch(new IncomingRequest("http://example.com/ranking/total"), env, ctx);
		await waitOnExecutionContext(ctx);
		const rankingBody = (await res.json()) as {
			ranking: { rank: number; nickname: string; champion_count: number; score: number }[];
		};
		expect(rankingBody.ranking[0]).toMatchObject({
			rank: 1,
			nickname: "覇者太郎",
			champion_count: 1,
		});

		res = await worker.fetch(
			new IncomingRequest("http://example.com/champion-rewards?device_id=champion-device-1"),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		const rewardBody = (await res.json()) as {
			ok: boolean;
			rewards: { nickname: string; champion_count: number; reward_card_id: string }[];
		};
		expect(rewardBody).toMatchObject({
			ok: true,
			rewards: [
				{
					nickname: "覇者太郎",
					champion_count: 1,
					reward_card_id: "legend_sonna_daiku_architecture",
				},
			],
		});

		res = await worker.fetch(
			new IncomingRequest("http://example.com/champion-rewards?device_id=champion-device-2"),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(await res.json()).toMatchObject({ ok: true, rewards: [] });
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
		expect(await res.json()).toMatchObject({ ok: true });

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

	it("POST /nickname accepts up to 10 characters and rejects 11 characters", async () => {
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: "dev-10chars", nickname: "１２３４５６７８９０" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: "dev-11chars", nickname: "１２３４５６７８９０１" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ ok: false, error: "nickname_length" });
	});

	it("POST /nickname rejects change to nickname held by another device", async () => {
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: "dev-x", nickname: "先取り" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: "dev-y", nickname: "別名" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: "dev-y", nickname: "先取り" }),
			}),
			env,
			ctx,
		);
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
		expect(await res.json()).toMatchObject({ ok: true });

		res = await worker.fetch(req(), env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
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

	it("POST /score rejects unknown job_id and extreme points", async () => {
		const device = "score-guard-device";
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/nickname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, nickname: "防御テスト" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);

		res = await worker.fetch(
			new IncomingRequest("http://example.com/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, job_id: "hacker", points: 100 }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ ok: false, score: 0 });

		res = await worker.fetch(
			new IncomingRequest("http://example.com/score", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ device_id: device, job_id: "cook", points: 10_000_001 }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ ok: false, score: 0 });

		const row = await env.DB.prepare(`SELECT score FROM scores WHERE device_id = ?`)
			.bind(device)
			.first<{ score: number }>();
		expect(row).toBeNull();
		const rankingRow = await env.DB.prepare(`SELECT score FROM ranking_scores WHERE device_id = ?`)
			.bind(device)
			.first<{ score: number }>();
		expect(rankingRow).toBeNull();
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
		expect(await res.json()).toMatchObject({ ok: true });

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
		expect(body.job_stats).toHaveLength(4);
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

	it("POST /apple/link stores backup and POST /apple/restore returns it", async () => {
		const ctx = createExecutionContext();
		const backup = {
			version: 1,
			createdAt: 123,
			storage: {
				"real-card-battle:device-id": "apple-device-1",
				"real-card-battle:unlocked-jobs": JSON.stringify(["cook"]),
			},
		};
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/apple/link", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					device_id: "apple-device-1",
					identity_token: "test.apple.identity.token",
					backup,
				}),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, device_id: "apple-device-1" });
		const linkRow = await env.DB.prepare(`SELECT apple_user_id FROM apple_account_links WHERE device_id = ?`)
			.bind("apple-device-1")
			.first<{ apple_user_id: string }>();
		expect(linkRow?.apple_user_id).toMatch(/^apple_sha256:/);
		expect(linkRow?.apple_user_id).not.toBe("apple-user-test-1");

		res = await worker.fetch(
			new IncomingRequest("http://example.com/apple/restore", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identity_token: "test.apple.identity.token" }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({
			ok: true,
			device_id: "apple-device-1",
			backup,
		});
	});

	it("POST /code and GET /admin/summary with admin code", async () => {
		const postCode = new IncomingRequest("http://example.com/code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code: TEST_ADMIN_CODE }),
		});
		const ctx = createExecutionContext();
		let res = await worker.fetch(postCode, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const codeBody = (await res.json()) as { ok: boolean; type: string; payload: unknown };
		expect(codeBody.ok).toBe(true);
		expect(codeBody.type).toBe("admin");

		const summaryReq = new IncomingRequest(
			"http://example.com/admin/summary?code=" + encodeURIComponent(TEST_ADMIN_CODE),
		);
		res = await worker.fetch(summaryReq, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		const sum = (await res.json()) as {
			total_players: number;
			total_plays: number;
			apple_linked_players: number;
			current_ranking_names: number;
			current_ranking_participants: number;
			selected_badge_players: number;
			job_stats: unknown[];
			top_cards: unknown[];
			top_enemies: unknown[];
			avg_gold_per_play: number;
			avg_play_time_seconds?: number;
			area_stats?: unknown[];
			top_combos?: unknown[];
			ranking_periods?: Array<{
				id: string;
				label: string;
				rankings: Array<{ job_id: string; rows: unknown[] }>;
			}>;
		};
		expect(typeof sum.total_players).toBe("number");
		expect(typeof sum.apple_linked_players).toBe("number");
		expect(typeof sum.current_ranking_names).toBe("number");
		expect(typeof sum.current_ranking_participants).toBe("number");
		expect(typeof sum.selected_badge_players).toBe("number");
		expect(Array.isArray(sum.job_stats)).toBe(true);
		expect(typeof sum.avg_play_time_seconds).toBe("number");
		expect(Array.isArray(sum.area_stats)).toBe(true);
		expect(Array.isArray(sum.top_combos)).toBe(true);
		expect(Array.isArray(sum.ranking_periods)).toBe(true);
		expect(sum.ranking_periods?.[0]?.rankings.some((r) => r.job_id === "total")).toBe(true);
	});

	it("POST /code accepts legacy admin code for developer access", async () => {
		const ctx = createExecutionContext();
		let res = await worker.fetch(
			new IncomingRequest("http://example.com/code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: LEGACY_ADMIN_CODE }),
			}),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, type: "admin" });

		res = await worker.fetch(
			new IncomingRequest(
				"http://example.com/admin/summary?code=" + encodeURIComponent(LEGACY_ADMIN_CODE),
			),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(200);
	});
});
