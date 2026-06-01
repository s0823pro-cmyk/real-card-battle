import type { Card, JobId } from '../types/game';

export const JOB_MASTERY_CHANGED_EVENT = 'job-mastery-changed';
export const JOB_MASTERY_MAX_LEVEL = 20;
export const JOB_MASTERY_SKIN_UNLOCK_LEVEL_BY_JOB: Record<JobId, number> = {
  carpenter: 3,
  cook: 6,
  unemployed: 9,
  courier: 12,
};

const XP_KEY_PREFIX = 'real-card-battle:job-mastery-xp:';
const CARD_SKIN_KEY = 'real-card-battle:job-mastery-card-skins';
const SELECTED_BADGE_KEY = 'real-card-battle:job-mastery-selected-badge';
const LAST_RUN_GAIN_KEY = 'real-card-battle:job-mastery-last-run-gain';

export const JOB_MASTERY_STORAGE_KEYS: readonly string[] = [CARD_SKIN_KEY, SELECTED_BADGE_KEY, LAST_RUN_GAIN_KEY];

export type MasteryBadgeTier = 'advanced' | 'expert' | 'sage';
export type MasteryBadgeId = `${JobId}:${MasteryBadgeTier}`;

export interface JobMasteryLevelInfo {
  jobId: JobId;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  isMax: boolean;
}

export interface JobMasteryRunGain {
  jobId: JobId;
  gainedXp: number;
  beforeXp: number;
  afterXp: number;
  beforeLevel: number;
  afterLevel: number;
  beforeProgress: number;
  afterProgress: number;
  levelUps: number;
  recordedAt: number;
}

export interface MasteryBadgeView {
  id: MasteryBadgeId;
  jobId: JobId;
  tier: MasteryBadgeTier;
  level: number;
  label: string;
  icon: string;
  className: string;
}

export type JobMasteryUnlockReward =
  | {
      kind: 'illustration2';
      level: number;
      label: string;
      description: string;
    }
  | {
      kind: 'badge';
      level: number;
      label: string;
      description: string;
      badge: MasteryBadgeView;
    };

const JOBS: readonly JobId[] = ['carpenter', 'cook', 'unemployed', 'courier'];

const STARTER_BASE_CARD_IDS: Record<JobId, readonly string[]> = {
  carpenter: ['hammer', 'saw_guard', 'build_scaffold', 'nail_strike', 'work_clothes'],
  cook: ['knife', 'apron', 'onion', 'flambe', 'prep'],
  unemployed: ['punch', 'cardboard', 'dogeza', 'kiai', 'yakekuso'],
  courier: [
    'courier_quick_delivery',
    'courier_parcel_guard',
    'courier_energy_drink',
    'courier_shortcut',
    'courier_breath_guard',
  ],
};

const BADGE_TIERS: Array<{ tier: MasteryBadgeTier; level: number; label: string }> = [
  { tier: 'advanced', level: 10, label: '上級者' },
  { tier: 'expert', level: 15, label: '玄人' },
  { tier: 'sage', level: 20, label: '仙人' },
];

const JOB_BADGE_ICONS: Record<JobId, Record<MasteryBadgeTier, string>> = {
  carpenter: { advanced: '🔨', expert: '🏗️', sage: '🏯' },
  cook: { advanced: '🔪', expert: '🔥', sage: '👑' },
  unemployed: { advanced: '📦', expert: '🌧️', sage: '✊' },
  courier: { advanced: '🏍️', expert: '⚡', sage: '🌃' },
};

const isJobId = (value: string): value is JobId => JOBS.includes(value as JobId);

const notifyChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(JOB_MASTERY_CHANGED_EVENT));
};

export const getJobMasteryXpKey = (jobId: JobId): string => `${XP_KEY_PREFIX}${jobId}`;

export const getAllJobMasteryStorageKeys = (): string[] => [
  ...JOBS.map((jobId) => getJobMasteryXpKey(jobId)),
  ...JOB_MASTERY_STORAGE_KEYS,
];

export const getRequiredXpForNextMasteryLevel = (level: number): number => {
  if (level >= JOB_MASTERY_MAX_LEVEL) return 0;
  return 10000 + Math.max(0, level - 1) * 4500;
};

export const getTotalXpRequiredForMasteryLevel = (level: number): number => {
  const target = Math.min(Math.max(1, Math.floor(level)), JOB_MASTERY_MAX_LEVEL);
  let total = 0;
  for (let current = 1; current < target; current += 1) {
    total += getRequiredXpForNextMasteryLevel(current);
  }
  return total;
};

export const getJobMasteryXp = (jobId: JobId): number => {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(getJobMasteryXpKey(jobId));
  const n = raw == null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export const setJobMasteryXp = (jobId: JobId, xp: number): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(getJobMasteryXpKey(jobId), String(Math.max(0, Math.floor(xp))));
  notifyChanged();
};

export const addJobMasteryXp = (jobId: JobId, points: number): void => {
  if (points <= 0) return;
  setJobMasteryXp(jobId, getJobMasteryXp(jobId) + Math.floor(points));
};

export const getJobMasteryLevelInfoFromXp = (jobId: JobId, xpInput: number): JobMasteryLevelInfo => {
  const xp = Math.max(0, Math.floor(xpInput));
  let level = 1;
  while (level < JOB_MASTERY_MAX_LEVEL && xp >= getTotalXpRequiredForMasteryLevel(level + 1)) {
    level += 1;
  }
  const currentLevelXp = getTotalXpRequiredForMasteryLevel(level);
  const nextLevelXp = getTotalXpRequiredForMasteryLevel(level + 1);
  const isMax = level >= JOB_MASTERY_MAX_LEVEL;
  const progress = isMax ? 1 : (xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp);
  return { jobId, xp, level, currentLevelXp, nextLevelXp, progress: Math.min(1, Math.max(0, progress)), isMax };
};

export const getJobMasteryLevelInfo = (jobId: JobId): JobMasteryLevelInfo =>
  getJobMasteryLevelInfoFromXp(jobId, getJobMasteryXp(jobId));

export const recordLastJobMasteryRunGain = (jobId: JobId, gainedXp: number): void => {
  if (typeof localStorage === 'undefined') return;
  const safeGain = Math.max(0, Math.floor(gainedXp));
  if (safeGain <= 0) {
    localStorage.setItem(
      LAST_RUN_GAIN_KEY,
      JSON.stringify({ jobId, gainedXp: 0, recordedAt: Date.now() }),
    );
    notifyChanged();
    return;
  }
  const afterXp = getJobMasteryXp(jobId);
  const beforeXp = Math.max(0, afterXp - safeGain);
  const before = getJobMasteryLevelInfoFromXp(jobId, beforeXp);
  const after = getJobMasteryLevelInfoFromXp(jobId, afterXp);
  const payload: JobMasteryRunGain = {
    jobId,
    gainedXp: safeGain,
    beforeXp,
    afterXp,
    beforeLevel: before.level,
    afterLevel: after.level,
    beforeProgress: before.progress,
    afterProgress: after.progress,
    levelUps: Math.max(0, after.level - before.level),
    recordedAt: Date.now(),
  };
  localStorage.setItem(LAST_RUN_GAIN_KEY, JSON.stringify(payload));
  notifyChanged();
};

export const getLastJobMasteryRunGain = (jobId: JobId): JobMasteryRunGain | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_RUN_GAIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JobMasteryRunGain>;
    if (parsed.jobId !== jobId || !parsed.gainedXp || parsed.gainedXp <= 0) return null;
    return {
      jobId,
      gainedXp: Math.max(0, Math.floor(parsed.gainedXp)),
      beforeXp: Math.max(0, Math.floor(parsed.beforeXp ?? 0)),
      afterXp: Math.max(0, Math.floor(parsed.afterXp ?? 0)),
      beforeLevel: Math.max(1, Math.floor(parsed.beforeLevel ?? 1)),
      afterLevel: Math.max(1, Math.floor(parsed.afterLevel ?? 1)),
      beforeProgress: Math.min(1, Math.max(0, Number(parsed.beforeProgress ?? 0))),
      afterProgress: Math.min(1, Math.max(0, Number(parsed.afterProgress ?? 0))),
      levelUps: Math.max(0, Math.floor(parsed.levelUps ?? 0)),
      recordedAt: Number(parsed.recordedAt ?? 0),
    };
  } catch {
    return null;
  }
};

export const getMasteryBadgeView = (badgeId: MasteryBadgeId): MasteryBadgeView | null => {
  const [jobIdRaw, tierRaw] = badgeId.split(':');
  if (!isJobId(jobIdRaw)) return null;
  const tier = tierRaw as MasteryBadgeTier;
  const tierDef = BADGE_TIERS.find((item) => item.tier === tier);
  if (!tierDef) return null;
  return {
    id: badgeId,
    jobId: jobIdRaw,
    tier,
    level: tierDef.level,
    label: tierDef.label,
    icon: JOB_BADGE_ICONS[jobIdRaw][tier],
    className: `mastery-badge mastery-badge--${jobIdRaw} mastery-badge--${tier}`,
  };
};

export const getJobMasteryUnlockRewards = (
  jobId: JobId,
  beforeLevel: number,
  afterLevel: number,
): JobMasteryUnlockReward[] => {
  const from = Math.max(1, Math.floor(beforeLevel));
  const to = Math.max(from, Math.floor(afterLevel));
  if (to <= from) return [];

  const rewards: JobMasteryUnlockReward[] = [];
  const illustration2Level = getStarterIllustration2UnlockLevel(jobId);
  if (from < illustration2Level && to >= illustration2Level) {
    rewards.push({
      kind: 'illustration2',
      level: illustration2Level,
      label: '初期カード5枚 イラスト2',
      description: '図鑑のカード詳細からデザインを切り替えできます。',
    });
  }

  BADGE_TIERS.forEach((tier) => {
    if (from >= tier.level || to < tier.level) return;
    const badge = getMasteryBadgeView(`${jobId}:${tier.tier}` as MasteryBadgeId);
    if (!badge) return;
    rewards.push({
      kind: 'badge',
      level: tier.level,
      label: `${tier.label}バッジ`,
      description: 'ランキングのあなたのスコアから表示バッジに設定できます。',
      badge,
    });
  });

  return rewards.sort((a, b) => a.level - b.level);
};

export const getUnlockedMasteryBadges = (): MasteryBadgeView[] =>
  JOBS.flatMap((jobId) => {
    const { level } = getJobMasteryLevelInfo(jobId);
    return BADGE_TIERS
      .filter((tier) => level >= tier.level)
      .map((tier) => getMasteryBadgeView(`${jobId}:${tier.tier}` as MasteryBadgeId))
      .filter((badge): badge is MasteryBadgeView => badge !== null);
  });

export const getSelectedMasteryBadgeId = (): MasteryBadgeId | null => {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SELECTED_BADGE_KEY);
  if (!raw) return null;
  const badge = getMasteryBadgeView(raw as MasteryBadgeId);
  if (!badge) return null;
  const unlocked = getUnlockedMasteryBadges().some((item) => item.id === badge.id);
  return unlocked ? badge.id : null;
};

export const setSelectedMasteryBadgeId = (badgeId: MasteryBadgeId | null): void => {
  if (typeof localStorage === 'undefined') return;
  if (badgeId == null) {
    localStorage.removeItem(SELECTED_BADGE_KEY);
    notifyChanged();
    return;
  }
  if (!getUnlockedMasteryBadges().some((badge) => badge.id === badgeId)) return;
  localStorage.setItem(SELECTED_BADGE_KEY, badgeId);
  notifyChanged();
};

const readCardSkinState = (): Record<string, 'v2'> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CARD_SKIN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, 'v2'> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (value === 'v2') result[key] = 'v2';
    });
    return result;
  } catch {
    return {};
  }
};

const writeCardSkinState = (state: Record<string, 'v2'>): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CARD_SKIN_KEY, JSON.stringify(state));
  notifyChanged();
};

export const getMasteryCardBaseId = (card: Card): string =>
  (card.baseCardId ?? card.definitionId ?? card.id).replace(/_\d+$/, '');

export const isStarterIllustration2Eligible = (jobId: JobId, card: Card): boolean =>
  STARTER_BASE_CARD_IDS[jobId].includes(getMasteryCardBaseId(card));

export const getStarterIllustration2UnlockLevel = (jobId: JobId): number =>
  JOB_MASTERY_SKIN_UNLOCK_LEVEL_BY_JOB[jobId];

export const canUseStarterIllustration2 = (jobId: JobId): boolean =>
  getJobMasteryLevelInfo(jobId).level >= getStarterIllustration2UnlockLevel(jobId);

const getCardSkinKey = (jobId: JobId, card: Card): string => `${jobId}:${getMasteryCardBaseId(card)}`;

export const getSelectedCardIllustrationVariant = (jobId: JobId, card: Card): 'v1' | 'v2' => {
  if (!canUseStarterIllustration2(jobId) || !isStarterIllustration2Eligible(jobId, card)) return 'v1';
  return readCardSkinState()[getCardSkinKey(jobId, card)] === 'v2' ? 'v2' : 'v1';
};

export const setSelectedCardIllustrationVariant = (jobId: JobId, card: Card, variant: 'v1' | 'v2'): void => {
  if (!canUseStarterIllustration2(jobId) || !isStarterIllustration2Eligible(jobId, card)) return;
  const state = readCardSkinState();
  const key = getCardSkinKey(jobId, card);
  if (variant === 'v2') state[key] = 'v2';
  else delete state[key];
  writeCardSkinState(state);
};

export const getMasteryCardImageUrl = (jobId: JobId, card: Card): string | undefined => {
  const variant = getSelectedCardIllustrationVariant(jobId, card);
  if (variant === 'v2') return card.imageVariant2Url ?? card.imageUrl;
  return card.imageUrl;
};

export const hasMasteryIllustration2Asset = (card: Card): boolean => Boolean(card.imageVariant2Url);
