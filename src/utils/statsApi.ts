import { ensureRankingDeviceId } from './rankingClient';

const RANKING_API = 'https://jobless-ranking.word2cardapi0823.workers.dev';

export type MyStatsResponse = {
	total_plays: number;
	total_wins: number;
	total_defeats: number;
	total_gold: number;
	avg_play_time_seconds: number;
	job_stats: Array<{ job_id: string; play_count: number; win_count: number }>;
	top_cards: Array<{ card_id: string; use_count: number }>;
	top_enemies: Array<{ enemy_id: string; kill_count: number }>;
};

function parseMyStats(data: unknown): MyStatsResponse | null {
	if (!data || typeof data !== 'object' || data === null) return null;
	const o = data as Record<string, unknown>;
	if (typeof o.total_plays !== 'number' || typeof o.total_wins !== 'number') return null;
	if (typeof o.total_defeats !== 'number' || typeof o.total_gold !== 'number') return null;
	if (typeof o.avg_play_time_seconds !== 'number') return null;
	if (!Array.isArray(o.job_stats) || !Array.isArray(o.top_cards) || !Array.isArray(o.top_enemies)) {
		return null;
	}
	for (const row of o.job_stats) {
		if (!row || typeof row !== 'object') return null;
		const r = row as Record<string, unknown>;
		if (typeof r.job_id !== 'string' || typeof r.play_count !== 'number' || typeof r.win_count !== 'number') {
			return null;
		}
	}
	for (const row of o.top_cards) {
		if (!row || typeof row !== 'object') return null;
		const r = row as Record<string, unknown>;
		if (typeof r.card_id !== 'string' || typeof r.use_count !== 'number') return null;
	}
	for (const row of o.top_enemies) {
		if (!row || typeof row !== 'object') return null;
		const r = row as Record<string, unknown>;
		if (typeof r.enemy_id !== 'string' || typeof r.kill_count !== 'number') return null;
	}
	return o as unknown as MyStatsResponse;
}

// バトル終了時に統計を送信
export async function postBattleStats(params: {
	deviceId: string;
	jobId: string;
	outcome: 'victory' | 'defeat';
	kills: number;
	gold: number;
	cardsUsed: Record<string, number>;
	enemiesKilled: Record<string, number>;
	winStreak: number;
	playTimeSeconds: number;
	areaReached: number;
	areaCleared: boolean;
	topCards: string[];
}): Promise<void> {
	try {
		await fetch(`${RANKING_API}/stats`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				device_id: params.deviceId,
				job_id: params.jobId,
				outcome: params.outcome,
				kills: params.kills,
				gold: params.gold,
				cards_used: params.cardsUsed,
				enemies_killed: params.enemiesKilled,
				win_streak: params.winStreak,
				play_time_seconds: params.playTimeSeconds,
				area_reached: params.areaReached,
				area_cleared: params.areaCleared,
				top_cards: params.topCards,
			}),
		});
	} catch {
		// 失敗しても無視
	}
}

// コード認証
export async function verifyCode(
	code: string,
): Promise<{ ok: boolean; type?: 'admin' | 'gift'; payload?: unknown }> {
	try {
		const res = await fetch(`${RANKING_API}/code`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		});
		return (await res.json()) as { ok: boolean; type?: 'admin' | 'gift'; payload?: unknown };
	} catch {
		return { ok: false };
	}
}

/** 端末の device_id（localStorage）でサーバー側の集計を取得 */
export async function getMyStats(): Promise<MyStatsResponse | null> {
	try {
		const deviceId = ensureRankingDeviceId();
		const res = await fetch(`${RANKING_API}/my-stats?device_id=${encodeURIComponent(deviceId)}`);
		if (!res.ok) return null;
		const raw: unknown = await res.json();
		if (raw && typeof raw === 'object' && 'error' in raw) return null;
		return parseMyStats(raw);
	} catch {
		return null;
	}
}

// 管理者集計取得
export async function getAdminSummary(code: string): Promise<unknown> {
	try {
		const res = await fetch(`${RANKING_API}/admin/summary?code=${encodeURIComponent(code)}`);
		return await res.json();
	} catch {
		return null;
	}
}
