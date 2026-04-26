const RANKING_API = 'https://jobless-ranking.word2cardapi0823.workers.dev';

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

// 管理者集計取得
export async function getAdminSummary(code: string): Promise<unknown> {
	try {
		const res = await fetch(`${RANKING_API}/admin/summary?code=${encodeURIComponent(code)}`);
		return await res.json();
	} catch {
		return null;
	}
}
