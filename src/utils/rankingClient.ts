import type { JobId } from '../types/game';

const RANKING_BASE_URL = 'https://jobless-ranking.word2cardapi0823.workers.dev';

export const RANKING_DEVICE_ID_KEY = 'real-card-battle:device-id';
export const RANKING_NICKNAME_KEY = 'real-card-battle:nickname';

/** 職業ごとの自己歴代最高（ランキング同期後のローカルキャッシュ） */
export const RANKING_BEST_SCORE_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-best-carpenter',
	cook: 'real-card-battle:ranking-best-cook',
	unemployed: 'real-card-battle:ranking-best-unemployed',
};

/** 現在ラン中の累計スコア（一時） */
export const RANKING_CURRENT_RUN_SCORE_KEY = 'real-card-battle:ranking-current-score';

/** 旧累積方式のキー（初回読み込み時に best へ移行） */
const LEGACY_CUMULATIVE_SCORE_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-score-carpenter',
	cook: 'real-card-battle:ranking-score-cook',
	unemployed: 'real-card-battle:ranking-score-unemployed',
};

function randomUuidV4(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export function ensureRankingDeviceId(): string {
	if (typeof localStorage === 'undefined') return randomUuidV4();
	let id = localStorage.getItem(RANKING_DEVICE_ID_KEY);
	if (!id || id.trim().length === 0) {
		id = randomUuidV4();
		localStorage.setItem(RANKING_DEVICE_ID_KEY, id);
	}
	return id;
}

export function getStoredRankingNickname(): string | null {
	if (typeof localStorage === 'undefined') return null;
	const v = localStorage.getItem(RANKING_NICKNAME_KEY);
	return v && v.trim().length > 0 ? v.trim() : null;
}

export function setStoredRankingNickname(nickname: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_NICKNAME_KEY, nickname.trim());
}

function migrateLegacyBestScoreOnce(jobId: JobId): void {
	if (typeof localStorage === 'undefined') return;
	const bestKey = RANKING_BEST_SCORE_KEYS[jobId];
	if (localStorage.getItem(bestKey) != null) return;
	const legacyRaw = localStorage.getItem(LEGACY_CUMULATIVE_SCORE_KEYS[jobId]);
	if (legacyRaw == null) return;
	const n = Number.parseInt(legacyRaw, 10);
	if (Number.isFinite(n) && n > 0) {
		localStorage.setItem(bestKey, String(Math.max(0, Math.floor(n))));
	}
}

/** 自己歴代最高（ランキング画面の「あなたのスコア」） */
export function getLocalRankingScore(jobId: JobId): number {
	if (typeof localStorage === 'undefined') return 0;
	migrateLegacyBestScoreOnce(jobId);
	const raw = localStorage.getItem(RANKING_BEST_SCORE_KEYS[jobId]);
	if (raw == null) return 0;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function setLocalRankingScore(jobId: JobId, score: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_BEST_SCORE_KEYS[jobId], String(Math.max(0, Math.floor(score))));
}

export function getCurrentRunRankingScore(): number {
	if (typeof localStorage === 'undefined') return 0;
	const raw = localStorage.getItem(RANKING_CURRENT_RUN_SCORE_KEY);
	if (raw == null) return 0;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function resetCurrentRunRankingScore(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_CURRENT_RUN_SCORE_KEY, '0');
}

function addCurrentRunRankingScore(points: number): void {
	if (typeof localStorage === 'undefined' || points <= 0) return;
	const next = getCurrentRunRankingScore() + Math.floor(points);
	localStorage.setItem(RANKING_CURRENT_RUN_SCORE_KEY, String(Math.max(0, next)));
}

/**
 * ラン中のスコア加算のみ（API は呼ばない）。
 */
export function reportRankingScore(_jobId: JobId, points: number): void {
	if (points <= 0) return;
	addCurrentRunRankingScore(points);
}

/**
 * ラン終了時: 今ランの合計が自己最高を超えた場合のみ POST /score。
 * 処理後は current-score を 0 に戻す。
 */
export function finalizeRankingRunEnd(jobId: JobId): void {
	const runTotal = getCurrentRunRankingScore();
	const best = getLocalRankingScore(jobId);
	resetCurrentRunRankingScore();
	if (runTotal <= best) return;
	void postRankingScore(jobId, runTotal);
}

export async function postRankingNickname(nickname: string): Promise<{ ok: boolean; error?: string }> {
	const deviceId = ensureRankingDeviceId();
	try {
		const res = await fetch(`${RANKING_BASE_URL}/nickname`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ device_id: deviceId, nickname: nickname.trim() }),
		});
		const data = (await res.json()) as { ok?: boolean; error?: string };
		if (data.ok) {
			setStoredRankingNickname(nickname.trim());
			return { ok: true };
		}
		return { ok: false, error: data.error ?? 'unknown' };
	} catch {
		return { ok: false, error: 'network' };
	}
}

/** `points` は「そのランの合計スコア」。サーバー側で DB 値との max を取る。 */
export async function postRankingScore(jobId: JobId, points: number): Promise<number | null> {
	if (points <= 0) return getLocalRankingScore(jobId);
	const deviceId = ensureRankingDeviceId();
	try {
		const res = await fetch(`${RANKING_BASE_URL}/score`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ device_id: deviceId, job_id: jobId, points: Math.floor(points) }),
		});
		const data = (await res.json()) as { ok?: boolean; score?: number };
		if (data.ok && typeof data.score === 'number') {
			setLocalRankingScore(jobId, data.score);
			return data.score;
		}
	} catch {
		// ignore
	}
	return null;
}

export type RankingRow = { rank: number; nickname: string; score: number };

export async function fetchRanking(jobId: JobId): Promise<{ ranking: RankingRow[] } | null> {
	try {
		const res = await fetch(`${RANKING_BASE_URL}/ranking/${jobId}`);
		if (!res.ok) return null;
		return (await res.json()) as { ranking: RankingRow[] };
	} catch {
		return null;
	}
}

export function nicknameCharLength(s: string): number {
	return [...s.trim()].length;
}
