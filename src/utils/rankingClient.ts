import type { JobId } from '../types/game';
import {
	addJobMasteryXp,
	getSelectedMasteryBadgeId,
	recordLastJobMasteryRunGain,
	type MasteryBadgeId,
} from './jobMasterySystem';
import {
	appendRankingScoreDetails,
	createEmptyRankingScoreBreakdown,
	createRankingScoreDetail,
	sumRankingScoreDetails,
	type RankingScoreBreakdown,
	type RankingScoreDetail,
	type RankingScoreDetailInput,
} from './rankingScore';

const RANKING_BASE_URL = 'https://jobless-ranking.word2cardapi0823.workers.dev';

export const RANKING_DEVICE_ID_KEY = 'real-card-battle:device-id';
export const RANKING_NICKNAME_KEY = 'real-card-battle:nickname';
export const RANKING_DISPLAY_CONSENT_KEY = 'real-card-battle:ranking-display-consent';
export const RANKING_SEASON_DEBUG_PREVIEW_KEY = 'real-card-battle:ranking-season-debug-preview';
export const RANKING_SEASON_DEBUG_PREVIEW_CHANGED_EVENT = 'ranking-season-debug-preview-changed';

export type RankingSeasonInfo = {
	id: string;
	label: string;
	endLabel: string;
	statusLabel: string;
	startAt: number;
	endAt: number;
	tallyEndAt: number;
	isActive: boolean;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_RANKING_TALLY_START_AT = Date.UTC(2026, 4, 31) - JST_OFFSET_MS;
const RANKING_CYCLE_START_AT = Date.UTC(2026, 5, 1) - JST_OFFSET_MS;
const RANKING_ACTIVE_DAYS = 13;
const RANKING_TALLY_DAYS = 2;
const RANKING_CYCLE_DAYS = RANKING_ACTIVE_DAYS + RANKING_TALLY_DAYS;
const PRE_SEASON_COMPAT_ID = '2026-05';
const DEBUG_SECOND_SEASON_NOW = RANKING_CYCLE_START_AT + 60 * 60 * 1000;

export function getRankingSeasonDebugPreviewEnabled(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(RANKING_SEASON_DEBUG_PREVIEW_KEY) === '1';
}

export function setRankingSeasonDebugPreviewEnabled(enabled: boolean): void {
	if (typeof localStorage === 'undefined') return;
	if (enabled) {
		localStorage.setItem(RANKING_SEASON_DEBUG_PREVIEW_KEY, '1');
	} else {
		localStorage.removeItem(RANKING_SEASON_DEBUG_PREVIEW_KEY);
	}
	window.dispatchEvent(new Event(RANKING_SEASON_DEBUG_PREVIEW_CHANGED_EVENT));
}

function formatDateEndLabel(endAt: number): string {
	const endDate = new Date(endAt - 1 + JST_OFFSET_MS);
	const endYear = endDate.getUTCFullYear();
	const endMonth = endDate.getUTCMonth() + 1;
	const endDay = endDate.getUTCDate();
	return `${endYear}/${endMonth}/${endDay} 23:59まで`;
}

function formatSeasonId(startAt: number): string {
	const d = new Date(startAt + JST_OFFSET_MS);
	const year = d.getUTCFullYear();
	const month = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getCurrentRankingSeasonInfo(now?: number): RankingSeasonInfo {
	const targetNow = now ?? (getRankingSeasonDebugPreviewEnabled() ? DEBUG_SECOND_SEASON_NOW : Date.now());
	if (targetNow < FIRST_RANKING_TALLY_START_AT) {
		return {
			id: 'legacy',
			label: '第1回総合ランキング',
			endLabel: formatDateEndLabel(FIRST_RANKING_TALLY_START_AT),
			statusLabel: '開催期間',
			startAt: 0,
			endAt: FIRST_RANKING_TALLY_START_AT,
			tallyEndAt: RANKING_CYCLE_START_AT,
			isActive: true,
		};
	}
	if (targetNow < RANKING_CYCLE_START_AT) {
		return {
			id: 'legacy',
			label: '第1回総合ランキング',
			endLabel: formatDateEndLabel(RANKING_CYCLE_START_AT),
			statusLabel: '結果集計中',
			startAt: 0,
			endAt: FIRST_RANKING_TALLY_START_AT,
			tallyEndAt: RANKING_CYCLE_START_AT,
			isActive: false,
		};
	}
	const elapsedCycles = Math.floor((targetNow - RANKING_CYCLE_START_AT) / (RANKING_CYCLE_DAYS * DAY_MS));
	const seasonStartAt = RANKING_CYCLE_START_AT + elapsedCycles * RANKING_CYCLE_DAYS * DAY_MS;
	const endAt = seasonStartAt + RANKING_ACTIVE_DAYS * DAY_MS;
	const tallyEndAt = seasonStartAt + RANKING_CYCLE_DAYS * DAY_MS;
	const seasonNumber = 2 + elapsedCycles;
	const isActive = targetNow < endAt;
	return {
		id: formatSeasonId(seasonStartAt),
		label: `第${seasonNumber}回総合ランキング`,
		endLabel: formatDateEndLabel(isActive ? endAt : tallyEndAt),
		statusLabel: isActive ? '開催期間' : '結果集計中',
		startAt: seasonStartAt,
		endAt,
		tallyEndAt,
		isActive,
	};
}

const getRankingSeasonStorageKey = (baseKey: string): string => `${baseKey}:${getCurrentRankingSeasonInfo().id}`;
const getRankingSeasonReadStorageKeys = (baseKey: string): string[] => {
	const current = getCurrentRankingSeasonInfo();
	if (current.id === 'legacy') return [baseKey, `${baseKey}:legacy`, `${baseKey}:${PRE_SEASON_COMPAT_ID}`];
	return [`${baseKey}:${current.id}`];
};

const readIntFromStorageKeys = (keys: string[]): number => {
	if (typeof localStorage === 'undefined') return 0;
	let best = 0;
	for (const key of keys) {
		const raw = localStorage.getItem(key);
		if (raw == null) continue;
		const n = Number.parseInt(raw, 10);
		if (Number.isFinite(n)) best = Math.max(best, n);
	}
	return Math.max(0, best);
};

/** 職業ごとの自己シーズン最高（ランキング同期後のローカルキャッシュ） */
export const RANKING_BEST_SCORE_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-best-carpenter',
	cook: 'real-card-battle:ranking-best-cook',
	unemployed: 'real-card-battle:ranking-best-unemployed',
	courier: 'real-card-battle:ranking-best-courier',
};

/** ニックネーム登録後、職業ごとに一度でもサーバーへスコアを送ったか */
export const RANKING_SCORE_SUBMITTED_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-submitted-carpenter',
	cook: 'real-card-battle:ranking-submitted-cook',
	unemployed: 'real-card-battle:ranking-submitted-unemployed',
	courier: 'real-card-battle:ranking-submitted-courier',
};

/** ニックネーム未登録のままラン終了した場合に、登録後へ引き継ぐ職業別スコア */
export const RANKING_PENDING_SCORE_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-pending-carpenter',
	cook: 'real-card-battle:ranking-pending-cook',
	unemployed: 'real-card-battle:ranking-pending-unemployed',
	courier: 'real-card-battle:ranking-pending-courier',
};

/** 現在ラン中の累計スコア（一時） */
export const RANKING_CURRENT_RUN_SCORE_KEY = 'real-card-battle:ranking-current-score';
const RANKING_CURRENT_RUN_MASTERY_AWARDED_KEY = 'real-card-battle:ranking-current-mastery-awarded';
const RANKING_CURRENT_RUN_MASTERY_GAINED_KEY = 'real-card-battle:ranking-current-mastery-gained';
const RANKING_CURRENT_BATTLE_BREAKDOWN_KEY = 'real-card-battle:ranking-current-battle-breakdown';
const RANKING_CURRENT_BATTLE_ACTIVE_KEY = 'real-card-battle:ranking-current-battle-active';
const MAX_RANKING_SCORE_PER_RUN = 50_000;

/** 旧累積方式のキー（初回読み込み時に best へ移行） */
export const LEGACY_RANKING_CUMULATIVE_SCORE_KEYS: Record<JobId, string> = {
	carpenter: 'real-card-battle:ranking-score-carpenter',
	cook: 'real-card-battle:ranking-score-cook',
	unemployed: 'real-card-battle:ranking-score-unemployed',
	courier: 'real-card-battle:ranking-score-courier',
};

/**
 * 設定の「データ初期化」で localStorage から消すランキング用スコアキャッシュのみ。
 * device-id / nickname は別途削除し、サーバー側のランキング行は削除しない。
 */
export const RANKING_SCORE_CACHE_STORAGE_KEYS: readonly string[] = [
	...Object.values(RANKING_BEST_SCORE_KEYS),
	...Object.values(RANKING_SCORE_SUBMITTED_KEYS),
	...Object.values(RANKING_PENDING_SCORE_KEYS),
	...Object.values(RANKING_BEST_SCORE_KEYS).map(getRankingSeasonStorageKey),
	...Object.values(RANKING_SCORE_SUBMITTED_KEYS).map(getRankingSeasonStorageKey),
	...Object.values(RANKING_PENDING_SCORE_KEYS).map(getRankingSeasonStorageKey),
	RANKING_CURRENT_RUN_SCORE_KEY,
	RANKING_CURRENT_RUN_MASTERY_AWARDED_KEY,
	RANKING_CURRENT_RUN_MASTERY_GAINED_KEY,
	RANKING_CURRENT_BATTLE_BREAKDOWN_KEY,
	RANKING_CURRENT_BATTLE_ACTIVE_KEY,
	...Object.values(LEGACY_RANKING_CUMULATIVE_SCORE_KEYS),
];

export const getRankingNicknameStorageKeys = (): string[] => [
	RANKING_NICKNAME_KEY,
	RANKING_DISPLAY_CONSENT_KEY,
	getRankingSeasonStorageKey(RANKING_DISPLAY_CONSENT_KEY),
	`${RANKING_NICKNAME_KEY}:legacy`,
	`${RANKING_NICKNAME_KEY}:${PRE_SEASON_COMPAT_ID}`,
	getRankingSeasonStorageKey(RANKING_NICKNAME_KEY),
];

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
	for (const key of getRankingSeasonReadStorageKeys(RANKING_NICKNAME_KEY)) {
		const v = localStorage.getItem(key);
		if (v && v.trim().length > 0) return v.trim();
	}
	return null;
}

export function setStoredRankingNickname(nickname: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(getRankingSeasonStorageKey(RANKING_NICKNAME_KEY), nickname.trim());
}


/** 自己シーズン最高（ランキング画面の「あなたのスコア」） */
export function getLocalRankingScore(jobId: JobId): number {
	return readIntFromStorageKeys(getRankingSeasonReadStorageKeys(RANKING_BEST_SCORE_KEYS[jobId]));
}

export function setLocalRankingScore(jobId: JobId, score: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(getRankingSeasonStorageKey(RANKING_BEST_SCORE_KEYS[jobId]), String(Math.max(0, Math.floor(score))));
}

function hasSubmittedRankingScore(jobId: JobId): boolean {
	if (typeof localStorage === 'undefined') return false;
	return getRankingSeasonReadStorageKeys(RANKING_SCORE_SUBMITTED_KEYS[jobId]).some((key) => localStorage.getItem(key) === '1');
}

function markRankingScoreSubmitted(jobId: JobId): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(getRankingSeasonStorageKey(RANKING_SCORE_SUBMITTED_KEYS[jobId]), '1');
}

export function getCurrentRunRankingScore(): number {
	if (typeof localStorage === 'undefined') return 0;
	const raw = localStorage.getItem(RANKING_CURRENT_RUN_SCORE_KEY);
	if (raw == null) return 0;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? Math.min(MAX_RANKING_SCORE_PER_RUN, Math.max(0, n)) : 0;
}

function getCurrentRunMasteryAwardedScore(): number {
	if (typeof localStorage === 'undefined') return 0;
	const raw = localStorage.getItem(RANKING_CURRENT_RUN_MASTERY_AWARDED_KEY);
	if (raw == null) return 0;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function setCurrentRunMasteryAwardedScore(score: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_CURRENT_RUN_MASTERY_AWARDED_KEY, String(Math.max(0, Math.floor(score))));
}

function getCurrentRunMasteryGainedXp(): number {
	if (typeof localStorage === 'undefined') return 0;
	const raw = localStorage.getItem(RANKING_CURRENT_RUN_MASTERY_GAINED_KEY);
	if (raw == null) return 0;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function addCurrentRunMasteryGainedXp(points: number): number {
	if (typeof localStorage === 'undefined' || points <= 0) return getCurrentRunMasteryGainedXp();
	const next = getCurrentRunMasteryGainedXp() + Math.floor(points);
	localStorage.setItem(RANKING_CURRENT_RUN_MASTERY_GAINED_KEY, String(Math.max(0, next)));
	return next;
}

export function getPendingRankingScore(jobId: JobId): number {
	return readIntFromStorageKeys(getRankingSeasonReadStorageKeys(RANKING_PENDING_SCORE_KEYS[jobId]));
}

function setPendingRankingScore(jobId: JobId, score: number): void {
	if (typeof localStorage === 'undefined') return;
	const next = Math.max(getPendingRankingScore(jobId), Math.max(0, Math.floor(score)));
	if (next <= 0) return;
	localStorage.setItem(getRankingSeasonStorageKey(RANKING_PENDING_SCORE_KEYS[jobId]), String(next));
}

function clearPendingRankingScore(jobId: JobId): void {
	if (typeof localStorage === 'undefined') return;
	for (const key of getRankingSeasonReadStorageKeys(RANKING_PENDING_SCORE_KEYS[jobId])) {
		localStorage.removeItem(key);
	}
}

function clearAllPendingRankingScores(): void {
	(['carpenter', 'cook', 'unemployed', 'courier'] as JobId[]).forEach(clearPendingRankingScore);
}

function getRankingDisplayConsentStorageKeys(): string[] {
	return getRankingSeasonReadStorageKeys(RANKING_DISPLAY_CONSENT_KEY);
}

function getExplicitRankingDisplayConsent(): boolean | null {
	if (typeof localStorage === 'undefined') return null;
	for (const key of getRankingDisplayConsentStorageKeys()) {
		const raw = localStorage.getItem(key);
		if (raw === '1') return true;
		if (raw === '0') return false;
	}
	return null;
}

export function isRankingDisplayConsentEnabled(): boolean {
	const explicit = getExplicitRankingDisplayConsent();
	if (explicit !== null) return explicit;
	// 既存ユーザー互換: このキー追加前に登録済みのランキング名は、従来どおり表示対象にする。
	return getStoredRankingNickname() !== null;
}

export function setRankingDisplayConsentEnabled(enabled: boolean): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(getRankingSeasonStorageKey(RANKING_DISPLAY_CONSENT_KEY), enabled ? '1' : '0');
	if (!enabled) clearAllPendingRankingScores();
}

export function enableRankingDisplayFromNextRun(): void {
	setRankingDisplayConsentEnabled(true);
	// 過去ランの保留スコアは送らない。ON後の次ランからランキング送信を開始する。
	clearAllPendingRankingScores();
}

export function getUnsubmittedRankingScore(jobId: JobId): number {
	return Math.max(getCurrentRunRankingScore(), getPendingRankingScore(jobId));
}

export function resetCurrentRunRankingScore(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_CURRENT_RUN_SCORE_KEY, '0');
	localStorage.setItem(RANKING_CURRENT_RUN_MASTERY_AWARDED_KEY, '0');
	localStorage.setItem(RANKING_CURRENT_RUN_MASTERY_GAINED_KEY, '0');
	resetCurrentBattleRankingBreakdown(false);
}

function addCurrentRunRankingScore(points: number): void {
	if (typeof localStorage === 'undefined' || points <= 0) return;
	const next = Math.min(MAX_RANKING_SCORE_PER_RUN, getCurrentRunRankingScore() + Math.floor(points));
	localStorage.setItem(RANKING_CURRENT_RUN_SCORE_KEY, String(Math.max(0, next)));
}

function isCurrentBattleRankingActive(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(RANKING_CURRENT_BATTLE_ACTIVE_KEY) === '1';
}

export function getCurrentBattleRankingBreakdown(): RankingScoreBreakdown {
	if (typeof localStorage === 'undefined') return createEmptyRankingScoreBreakdown();
	const raw = localStorage.getItem(RANKING_CURRENT_BATTLE_BREAKDOWN_KEY);
	if (!raw) return createEmptyRankingScoreBreakdown();
	try {
		const parsed = JSON.parse(raw) as RankingScoreBreakdown;
		if (!parsed || typeof parsed.total !== 'number' || !Array.isArray(parsed.categories)) {
			return createEmptyRankingScoreBreakdown();
		}
		return parsed;
	} catch {
		return createEmptyRankingScoreBreakdown();
	}
}

function setCurrentBattleRankingBreakdown(breakdown: RankingScoreBreakdown): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RANKING_CURRENT_BATTLE_BREAKDOWN_KEY, JSON.stringify(breakdown));
}

export function resetCurrentBattleRankingBreakdown(active = true): void {
	if (typeof localStorage === 'undefined') return;
	setCurrentBattleRankingBreakdown(createEmptyRankingScoreBreakdown());
	localStorage.setItem(RANKING_CURRENT_BATTLE_ACTIVE_KEY, active ? '1' : '0');
}

function addCurrentBattleRankingDetails(details: RankingScoreDetail[]): void {
	if (!isCurrentBattleRankingActive() || details.length === 0) return;
	setCurrentBattleRankingBreakdown(appendRankingScoreDetails(getCurrentBattleRankingBreakdown(), details));
}

export function finishCurrentBattleRankingBreakdown(): RankingScoreBreakdown {
	const breakdown = getCurrentBattleRankingBreakdown();
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(RANKING_CURRENT_BATTLE_ACTIVE_KEY, '0');
	}
	return breakdown;
}

/**
 * ラン中のスコア加算のみ（API は呼ばない）。
 */
export function reportRankingScore(_jobId: JobId, points: number, detail?: RankingScoreDetailInput): void {
	if (points <= 0) return;
	const scoreDetail = createRankingScoreDetail(points, detail);
	addCurrentRunRankingScore(scoreDetail.points);
	addCurrentBattleRankingDetails([scoreDetail]);
}

export function reportRankingScoreDetails(_jobId: JobId, details: RankingScoreDetail[]): number {
	const points = sumRankingScoreDetails(details);
	if (points <= 0) return 0;
	addCurrentRunRankingScore(points);
	addCurrentBattleRankingDetails(details);
	return points;
}

/**
 * 熟練度XPはランキングスコアを流用するが、付与タイミングは章クリア/ラン終了のみ。
 * 章クリアごとに呼んでも重複しないよう、現在ラン内の付与済みスコアとの差分だけ加算する。
 */
export function awardCurrentRunMasteryXp(jobId: JobId): number {
	const runTotal = getCurrentRunRankingScore();
	const alreadyAwarded = getCurrentRunMasteryAwardedScore();
	const delta = Math.max(0, runTotal - alreadyAwarded);
	if (delta > 0) {
		addJobMasteryXp(jobId, delta);
		setCurrentRunMasteryAwardedScore(runTotal);
		recordLastJobMasteryRunGain(jobId, addCurrentRunMasteryGainedXp(delta));
	}
	return delta;
}

/**
 * ラン終了時:
 * - ニックネーム登録前は送信しない
 * - ニックネーム登録後の職業別初回ランは、自己最高未満でも必ず POST /score
 * - 2回目以降は今ランの合計が自己最高を超えた場合のみ POST /score
 * 処理後は current-score を 0 に戻す。
 */
export async function finalizeRankingRunEndAsync(jobId: JobId): Promise<void> {
	const runTotal = getCurrentRunRankingScore();
	const best = getLocalRankingScore(jobId);
	const hasNickname = getStoredRankingNickname() !== null;
	const canSubmitRanking = hasNickname && isRankingDisplayConsentEnabled();
	const shouldSubmitFirstRun = canSubmitRanking && !hasSubmittedRankingScore(jobId);
	awardCurrentRunMasteryXp(jobId);
	recordLastJobMasteryRunGain(jobId, getCurrentRunMasteryGainedXp());
	resetCurrentRunRankingScore();
	if (!hasNickname) {
		setPendingRankingScore(jobId, runTotal);
		return;
	}
	if (!canSubmitRanking) return;
	if (!shouldSubmitFirstRun && runTotal <= best) return;
	await postRankingScore(jobId, runTotal);
}

export function finalizeRankingRunEnd(jobId: JobId): void {
	void finalizeRankingRunEndAsync(jobId);
}

export async function syncPendingRankingScores(): Promise<void> {
	const jobs: JobId[] = ['carpenter', 'cook', 'unemployed', 'courier'];
	if (!getStoredRankingNickname() || !isRankingDisplayConsentEnabled()) return;
	for (const jobId of jobs) {
		const score = getPendingRankingScore(jobId);
		if (score <= 0) continue;
		const synced = await postRankingScore(jobId, score);
		if (synced !== null) clearPendingRankingScore(jobId);
	}
}

export async function postRankingNickname(nickname: string, allowRankingDisplay = true): Promise<{ ok: boolean; error?: string }> {
	const deviceId = ensureRankingDeviceId();
	if (getRankingSeasonDebugPreviewEnabled()) {
		setStoredRankingNickname(nickname.trim());
		setRankingDisplayConsentEnabled(allowRankingDisplay);
		if (allowRankingDisplay) await syncPendingRankingScores();
		return { ok: true };
	}
	try {
		const res = await fetch(`${RANKING_BASE_URL}/nickname`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ device_id: deviceId, nickname: nickname.trim() }),
		});
		const data = (await res.json()) as { ok?: boolean; error?: string };
		if (data.ok) {
			setStoredRankingNickname(nickname.trim());
			setRankingDisplayConsentEnabled(allowRankingDisplay);
			if (allowRankingDisplay) {
				void postRankingBadge(getSelectedMasteryBadgeId());
				await syncPendingRankingScores();
			}
			return { ok: true };
		}
		return { ok: false, error: data.error ?? 'unknown' };
	} catch {
		return { ok: false, error: 'network' };
	}
}

/** `points` は「そのランの合計スコア」。サーバー側で DB 値との max を取る。 */
export async function postRankingScore(jobId: JobId, points: number): Promise<number | null> {
	if (points < 0) return getLocalRankingScore(jobId);
	if (!getStoredRankingNickname() || !isRankingDisplayConsentEnabled()) return null;
	if (!getCurrentRankingSeasonInfo().isActive) return null;
	if (getRankingSeasonDebugPreviewEnabled()) {
		const localScore = Math.max(getLocalRankingScore(jobId), Math.max(0, Math.floor(points)));
		setLocalRankingScore(jobId, localScore);
		markRankingScoreSubmitted(jobId);
		return localScore;
	}
	const deviceId = ensureRankingDeviceId();
	try {
		const res = await fetch(`${RANKING_BASE_URL}/score`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ device_id: deviceId, job_id: jobId, points: Math.max(0, Math.floor(points)) }),
		});
		const data = (await res.json()) as { ok?: boolean; score?: number };
		if (data.ok && typeof data.score === 'number') {
			setLocalRankingScore(jobId, Math.max(getLocalRankingScore(jobId), data.score));
			markRankingScoreSubmitted(jobId);
			return data.score;
		}
	} catch {
		// ignore
	}
	return null;
}

export async function postRankingBadge(selectedBadge: MasteryBadgeId | null): Promise<{ ok: boolean }> {
	const deviceId = ensureRankingDeviceId();
	if (!getStoredRankingNickname() || !isRankingDisplayConsentEnabled()) return { ok: false };
	if (getRankingSeasonDebugPreviewEnabled()) return { ok: true };
	try {
		const res = await fetch(`${RANKING_BASE_URL}/badge`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ device_id: deviceId, selected_badge: selectedBadge }),
		});
		const data = (await res.json()) as { ok?: boolean };
		return { ok: data.ok === true };
	} catch {
		return { ok: false };
	}
}

export type RankingRow = {
	rank: number;
	nickname: string;
	score: number;
	selected_badge?: MasteryBadgeId | null;
	champion_count?: number | null;
};

export async function fetchRanking(jobId: JobId): Promise<{ ranking: RankingRow[] } | null> {
	if (getRankingSeasonDebugPreviewEnabled()) return { ranking: [] };
	try {
		const res = await fetch(`${RANKING_BASE_URL}/ranking/${jobId}`);
		if (!res.ok) return null;
		return (await res.json()) as { ranking: RankingRow[] };
	} catch {
		return null;
	}
}

export async function fetchTotalRanking(): Promise<{ ranking: RankingRow[] } | null> {
	if (getRankingSeasonDebugPreviewEnabled()) return { ranking: [] };
	try {
		const res = await fetch(`${RANKING_BASE_URL}/ranking/total`);
		if (!res.ok) return null;
		return (await res.json()) as { ranking: RankingRow[] };
	} catch {
		return null;
	}
}

export function nicknameCharLength(s: string): number {
	return [...s.trim()].length;
}
