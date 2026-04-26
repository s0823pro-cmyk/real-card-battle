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
});
