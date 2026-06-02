import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import type { Card, JobId } from '../../types/game';
import {
  enableRankingDisplayFromNextRun,
  fetchRanking,
  fetchTotalRanking,
  getCurrentRankingSeasonInfo,
  getLocalRankingScore,
  getStoredRankingNickname,
  isRankingDisplayConsentEnabled,
  nicknameCharLength,
  postRankingBadge,
  postRankingNickname,
  RANKING_NICKNAME_MAX_LENGTH,
  RANKING_NICKNAME_MIN_LENGTH,
  type RankingRow,
} from '../../utils/rankingClient';
import {
  getJobMasteryLevelInfo,
  getMasteryBadgeView,
  getSelectedMasteryBadgeId,
  getUnlockedMasteryBadges,
  JOB_MASTERY_CHANGED_EVENT,
  setSelectedMasteryBadgeId,
  type MasteryBadgeId,
  type MasteryBadgeView,
} from '../../utils/jobMasterySystem';
import { RANKING_SCORE_GUIDE } from '../../utils/rankingScore';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { isJobUnlocked } from '../../utils/jobUnlockSystem';
import CardComponent from '../Hand/CardComponent';
import {
  DAR_REQUIEM_CARD,
  LEGENDARY_REWARD_CARDS,
  LEGENDARY_WINNERS,
  type LegendaryWinner,
} from '../../data/legendaryRewardCards';
import { getMasteryBadgeImage, getRankingChampionBadgeImage } from '../../data/badgeImages';
import {
  NAME_CHANGE_TICKET_CHANGED_EVENT,
  consumeNameChangeTicket,
  getNameChangeTicketCount,
} from '../../utils/nameChangeTicket';
import '../Hand/Hand.css';
import './RankingScreen.css';

type RankingTabJobId = Extract<JobId, 'carpenter' | 'cook' | 'unemployed' | 'courier'>;
type RankingTabId = 'total' | RankingTabJobId;

const RANKING_DISPLAY_LIMIT = 10;

const JOB_TABS: {
  id: RankingTabId;
  labelKey?: MessageKey;
  label?: string;
  icon: string;
  alias: string;
  motto: string;
}[] = [
  { id: 'total', label: '総合', icon: '🏆', alias: 'TOTAL', motto: '全職業の自己ベスト合計で競う総合順位' },
  { id: 'carpenter', labelKey: 'job.carpenter.name', icon: '🔨', alias: 'CARPENTER', motto: '足場と判断力で伸ばす職業別順位' },
  { id: 'cook', labelKey: 'job.cook.name', icon: '🔪', alias: 'COOK', motto: '火力と継戦力で伸ばす職業別順位' },
  { id: 'unemployed', labelKey: 'job.unemployed.name', icon: '✊', alias: 'JOBLESS', motto: '瀬戸際で伸ばす職業別順位' },
  { id: 'courier', labelKey: 'job.courier.name', icon: '🏍️', alias: 'COURIER', motto: '連打と過労管理で伸ばす職業別順位' },
];

interface RankingScreenProps {
  onClose: () => void;
}

const STATIC_EFFECTIVE_VALUES: EffectiveCardValues = {
  damage: null,
  block: null,
  heal: null,
  effectiveTimeCost: 0,
  isTimeBuffed: false,
  isTimeDebuffed: false,
  isDamageBuffed: false,
  isDamageDebuffed: false,
  isBlockBuffed: false,
  isBlockDebuffed: false,
  isHealBuffed: false,
  isHealDebuffed: false,
  isAttackDamageWeakDebuffed: false,
  isBoosted: false,
  isDamageBoosted: false,
  isBlockBoosted: false,
};

const noop = () => {
  // ランキング内カードプレビューは表示専用。
};

const noopPointer = (event: ReactPointerEvent) => {
  void event;
  // ランキング内カードプレビューは表示専用。
};

function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toLocaleString();
}

function getRankClass(rank: number): string {
  if (rank <= 3) return 'ranking-row--top';
  return '';
}

function getTabLabel(tab: (typeof JOB_TABS)[number], t: (key: MessageKey) => string): string {
  if (tab.label) return tab.label;
  return tab.labelKey ? t(tab.labelKey) : tab.id;
}

function canRevealRankingJobName(tabId: RankingTabId): boolean {
  return tabId === 'total' || tabId === 'carpenter' || isJobUnlocked(tabId);
}

function getRankingTabLabel(tab: (typeof JOB_TABS)[number], t: (key: MessageKey) => string): string {
  if (canRevealRankingJobName(tab.id)) return getTabLabel(tab, t);
  return t('job.unknownName');
}

function getLocalTabScore(tabId: RankingTabId): number {
  if (tabId === 'total') {
    return (
      getLocalRankingScore('carpenter') +
      getLocalRankingScore('cook') +
      getLocalRankingScore('unemployed') +
      getLocalRankingScore('courier')
    );
  }
  return getLocalRankingScore(tabId);
}

function buildTotalRanking(results: Array<{ ranking: RankingRow[] } | null>): RankingRow[] | null {
  if (results.some((result) => result == null)) return null;
  const scoreByNickname = new Map<string, number>();
  const badgeByNickname = new Map<string, MasteryBadgeId | null>();
  const championCountByNickname = new Map<string, number>();
  for (const result of results) {
    for (const row of result?.ranking ?? []) {
      scoreByNickname.set(row.nickname, (scoreByNickname.get(row.nickname) ?? 0) + row.score);
      if (row.selected_badge && !badgeByNickname.has(row.nickname)) {
        badgeByNickname.set(row.nickname, row.selected_badge);
      }
      championCountByNickname.set(
        row.nickname,
        Math.max(championCountByNickname.get(row.nickname) ?? 0, row.champion_count ?? 0),
      );
    }
  }
  return [...scoreByNickname.entries()]
    .map(([nickname, score]) => ({
      nickname,
      score,
      selected_badge: badgeByNickname.get(nickname) ?? null,
      champion_count: championCountByNickname.get(nickname) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'ja'))
    .slice(0, 100)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function getChampionBadgeLabel(count?: number | null): string | null {
  if (!count || count <= 0) return null;
  const labels = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
  return `覇者${labels[Math.min(count, 5) - 1]}`;
}

function getLegendaryWinnerCard(winner: LegendaryWinner): Card {
  const template = LEGENDARY_REWARD_CARDS.find((card) => card.name === winner.card.name) ?? DAR_REQUIEM_CARD;
  return {
    ...template,
    name: winner.card.name,
    description: winner.card.description,
    imageUrl: winner.card.imageUrl ?? template.imageUrl,
    badges: winner.card.badges ?? template.badges,
  };
}

function getPreviewValues(card: Card): EffectiveCardValues {
  return {
    ...STATIC_EFFECTIVE_VALUES,
    damage: card.damage ?? null,
    block: card.block ?? null,
    heal:
      (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
      null,
    effectiveTimeCost: card.timeCost,
  };
}

function ChampionBadgePill({ count }: { count?: number | null }) {
  const label = getChampionBadgeLabel(count);
  if (!label) return null;
  const imageUrl = getRankingChampionBadgeImage(count);
  return (
    <span
      className={`ranking-champion-badge ${count && count >= 5 ? 'ranking-champion-badge--max' : ''}`}
      title={`総合優勝 ${count}回`}
      aria-label={`総合優勝 ${count}回`}
    >
      {imageUrl ? (
        <img className="ranking-champion-badge__icon" src={imageUrl} alt="" aria-hidden="true" />
      ) : (
        <span aria-hidden>🏆</span>
      )}
    </span>
  );
}

function MasteryBadgePill({ badge }: { badge: MasteryBadgeView }) {
  const imageUrl = getMasteryBadgeImage(badge.jobId, badge.tier);
  return (
    <span className={badge.className} title={`${badge.label} Lv${badge.level}`} aria-label={`${badge.label} Lv${badge.level}`}>
      {imageUrl ? (
        <img className="mastery-badge__icon" src={imageUrl} alt="" aria-hidden="true" />
      ) : (
        <span aria-hidden>{badge.icon}</span>
      )}
    </span>
  );
}

export function RankingScreen({ onClose }: RankingScreenProps) {
  const { t } = useLanguage();
  const { playBgm } = useAudioContext();
  const [jobId, setJobId] = useState<RankingTabId>('total');
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedLegend, setSelectedLegend] = useState<LegendaryWinner | null>(null);
  const [legendTopThreeOpen, setLegendTopThreeOpen] = useState(false);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const [nameChangeOpen, setNameChangeOpen] = useState(false);
  const [nameChangeDraft, setNameChangeDraft] = useState('');
  const [nameChangeBusy, setNameChangeBusy] = useState(false);
  const [nameChangeError, setNameChangeError] = useState<string | null>(null);
  const [nameChangeTicketCount, setNameChangeTicketCount] = useState(() => getNameChangeTicketCount());
  const [masteryRevision, setMasteryRevision] = useState(0);
  const [rankingConsentRevision, setRankingConsentRevision] = useState(0);

  useEffect(() => {
    playBgm('menu');
  }, [playBgm]);

  useEffect(() => {
    const onMasteryChanged = () => setMasteryRevision((v) => v + 1);
    window.addEventListener(JOB_MASTERY_CHANGED_EVENT, onMasteryChanged);
    return () => window.removeEventListener(JOB_MASTERY_CHANGED_EVENT, onMasteryChanged);
  }, []);

  useEffect(() => {
    const onTicketChanged = () => setNameChangeTicketCount(getNameChangeTicketCount());
    window.addEventListener(NAME_CHANGE_TICKET_CHANGED_EVENT, onTicketChanged);
    return () => window.removeEventListener(NAME_CHANGE_TICKET_CHANGED_EVENT, onTicketChanged);
  }, []);

  const load = useCallback(async (jid: RankingTabId) => {
    setLoading(true);
    setError(null);
    let data: RankingRow[] | null | undefined;
    if (jid === 'total') {
      const serverTotal = await fetchTotalRanking();
      data = serverTotal?.ranking.slice(0, 100);
      if (!data) {
        data = buildTotalRanking(await Promise.all([
          fetchRanking('carpenter'),
          fetchRanking('cook'),
          fetchRanking('unemployed'),
          fetchRanking('courier'),
        ]));
      }
    } else {
      data = (await fetchRanking(jid))?.ranking.slice(0, 100);
    }
    if (!data) {
      setRows([]);
      setError(t('ranking.errorLoad'));
    } else {
      setRows(data);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(jobId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [jobId, load]);

  const myNickname = getStoredRankingNickname() ?? t('ranking.unsetNickname');
  const myScore = getLocalTabScore(jobId);
  const activeJob = JOB_TABS.find((tab) => tab.id === jobId) ?? JOB_TABS[0];
  const seasonInfo = getCurrentRankingSeasonInfo();
  const topRows = rows.slice(0, 3);
  const displayRows = rows.slice(0, RANKING_DISPLAY_LIMIT);
  const leaderScore = rows[0]?.score ?? 0;
  const activeJobNameRevealed = canRevealRankingJobName(activeJob.id);
  const activeTabLabel = getRankingTabLabel(activeJob, t);
  const rankLabel = jobId === 'total' ? '総合順位' : '職業順位';
  const selectedMasteryBadge = getSelectedMasteryBadgeId();
  const selectedMasteryBadgeView = selectedMasteryBadge ? getMasteryBadgeView(selectedMasteryBadge) : null;
  const unlockedMasteryBadges = getUnlockedMasteryBadges();
  const masteryInfo =
    jobId === 'total'
      ? null
      : getJobMasteryLevelInfo(jobId);
  void masteryRevision;
  void rankingConsentRevision;
  const rankingDisplayConsentEnabled = isRankingDisplayConsentEnabled();

  const selectMasteryBadge = useCallback((badgeId: MasteryBadgeId | null) => {
    setSelectedMasteryBadgeId(badgeId);
    void postRankingBadge(badgeId);
  }, []);

  const enableRankingDisplay = useCallback(() => {
    enableRankingDisplayFromNextRun();
    void postRankingBadge(getSelectedMasteryBadgeId());
    setRankingConsentRevision((v) => v + 1);
  }, []);

  const openNameChangeModal = useCallback(() => {
    const current = getStoredRankingNickname();
    if (!current || nameChangeTicketCount <= 0) return;
    setNameChangeDraft(current);
    setNameChangeError(null);
    setNameChangeOpen(true);
  }, [nameChangeTicketCount]);

  const submitNameChange = useCallback(async () => {
    const current = getStoredRankingNickname();
    if (!current) {
      setNameChangeOpen(false);
      return;
    }
    const len = nicknameCharLength(nameChangeDraft);
    if (len < RANKING_NICKNAME_MIN_LENGTH || len > RANKING_NICKNAME_MAX_LENGTH) {
      setNameChangeError(t('home.ranking.errLength'));
      return;
    }
    const nextNickname = nameChangeDraft.trim();
    if (nextNickname === current) {
      setNameChangeError('現在と同じ名前です。');
      return;
    }
    if (getNameChangeTicketCount() <= 0) {
      setNameChangeError('ネーム変更チケットがありません。');
      setNameChangeTicketCount(0);
      return;
    }
    setNameChangeBusy(true);
    setNameChangeError(null);
    const result = await postRankingNickname(nextNickname, isRankingDisplayConsentEnabled());
    setNameChangeBusy(false);
    if (!result.ok) {
      const err = result.error;
      if (err === 'network') setNameChangeError(t('home.ranking.errNetwork'));
      else if (err === 'nickname_not_allowed') setNameChangeError(t('home.ranking.errNickname'));
      else if (err === 'nickname_taken') setNameChangeError(t('home.ranking.errNicknameTaken'));
      else if (err === 'nickname_length') setNameChangeError(t('home.ranking.errLength'));
      else setNameChangeError(t('home.ranking.errRegister'));
      return;
    }
    if (!consumeNameChangeTicket()) {
      setNameChangeError('ネーム変更チケットの消費に失敗しました。');
      return;
    }
    setNameChangeTicketCount(getNameChangeTicketCount());
    setNameChangeOpen(false);
    setRankingConsentRevision((v) => v + 1);
    void load(jobId);
  }, [jobId, load, nameChangeDraft, t]);

  const getRowMasteryBadgeView = useCallback(
    (row: RankingRow): MasteryBadgeView | null => {
      const isMe = row.nickname === getStoredRankingNickname();
      if (isMe && selectedMasteryBadgeView) return selectedMasteryBadgeView;
      return row.selected_badge ? getMasteryBadgeView(row.selected_badge) : null;
    },
    [selectedMasteryBadgeView],
  );

  const closeLegendPage = useCallback(() => {
    setLegendOpen(false);
    setSelectedLegend(null);
    setLegendTopThreeOpen(false);
  }, []);

  const legendPageContent = selectedLegend ? (
    <div className="ranking-legend-card-detail">
      <div className="ranking-legend-detail-actions">
        <button
          type="button"
          className="ranking-legend-back"
          onClick={() => {
            setSelectedLegend(null);
            setLegendTopThreeOpen(false);
          }}
        >
          ← 歴代覇者一覧へ
        </button>
        <button
          type="button"
          className={`ranking-legend-top-three-btn ${legendTopThreeOpen ? 'ranking-legend-top-three-btn--active' : ''}`}
          onClick={() => setLegendTopThreeOpen((v) => !v)}
        >
          TOP3
        </button>
      </div>
      {legendTopThreeOpen ? (
        <div className="ranking-legend-top-three">
          <div className="ranking-legend-top-three-head">
            <p>{selectedLegend.seasonLabel}</p>
            <strong>確定時点 TOP3</strong>
            <small>{selectedLegend.capturedAt} 集計</small>
          </div>
          <div className="ranking-legend-top-three-list">
            {selectedLegend.finalRankingTop3.map((row) => (
              <div key={`${selectedLegend.id}-${row.rank}-${row.nickname}`} className={`ranking-legend-top-three-row ranking-legend-top-three-row--${row.rank}`}>
                <span>#{row.rank}</span>
                <strong>{row.nickname}</strong>
                <em>{formatScore(row.score)} pt</em>
              </div>
            ))}
          </div>
          <p className="ranking-guide-note">
            表示ポイントは、集計期間に入った時点の最終ランキングスナップショットです。
          </p>
        </div>
      ) : (
        <div className="ranking-legend-card-view">
          <div className="ranking-legend-card-status-row">
            <span>{selectedLegend.seasonLabel}</span>
          </div>
          <div className="ranking-legend-card-component-wrap">
            <CardComponent
              card={getLegendaryWinnerCard(selectedLegend)}
              jobId="carpenter"
              selected={false}
              disabled={false}
              locked={false}
              isSelling={false}
              isReturning={false}
              isGhost={false}
              isDragging={false}
              isDragUnavailable={false}
              zukanMode="detail"
              effectiveValues={getPreviewValues(getLegendaryWinnerCard(selectedLegend))}
              onSelect={noop}
              onPointerDown={noopPointer}
              onPointerMove={noopPointer}
              onPointerUp={noopPointer}
              onPointerCancel={noop}
              onMouseEnter={noop}
              onMouseLeave={noop}
            />
            <span className="ranking-legend-owner-badge">
              ユーザー名：{selectedLegend.winnerName}
            </span>
          </div>
          <p className="ranking-legend-card-flavor">{selectedLegend.card.flavor}</p>
          <p className="ranking-legend-candidate-note">
            {selectedLegend.capturedAt} 集計時点の最終ランキングをもとに確定したカードです。
          </p>
        </div>
      )}
    </div>
  ) : LEGENDARY_WINNERS.length === 0 ? (
    <div className="ranking-legend-empty">
      <p className="ranking-legend-empty-title">まだ歴代覇者はいません。</p>
      <p>
        ここでは、前回までのシーズンで総合ポイント1位になった歴代覇者名を確認できます。
      </p>
      <p>
        優勝者名をタッチすると、その名前をもとに作られた記念カードを確認できます。
      </p>
    </div>
  ) : (
    <>
      <div className="ranking-legend-list">
        {LEGENDARY_WINNERS.map((winner) => (
          <button
            key={winner.id}
            type="button"
            className="ranking-legend-row"
            onClick={() => {
              setSelectedLegend(winner);
              setLegendTopThreeOpen(false);
            }}
          >
            <span>
              <strong>{winner.winnerName}</strong>
              <small>{winner.seasonLabel}</small>
            </span>
            <em>{formatScore(winner.totalScore)} pt</em>
          </button>
        ))}
      </div>
      <p className="ranking-guide-note">
        新シーズンではランキング名がリセットされます。前回と同じ名前も使用できます。表示名やカード名は、読みやすさ・安全性・権利面の都合で少し調整される場合があります。
      </p>
    </>
  );

  const myRankInList = useMemo(() => {
    const nick = getStoredRankingNickname();
    if (!nick) return null;
    const idx = rows.findIndex((r) => r.nickname === nick);
    if (idx < 0) return null;
    return rows[idx].rank;
  }, [rows]);

  if (legendOpen) {
    return (
      <div className="ranking-overlay">
        <div className="ranking-modal ranking-modal--legend-page">
          <header className="ranking-header ranking-header--legend-page">
            <button type="button" className="ranking-back-btn" onClick={closeLegendPage}>
              ← ランキング
            </button>
            <div className="ranking-title-wrap">
              <p className="ranking-kicker">CHAMPIONS</p>
              <h1 className="ranking-title">歴代覇者</h1>
            </div>
          </header>
          <main className="ranking-legend-page-body">
            {legendPageContent}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-overlay" onClick={onClose}>
      <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
        <header className="ranking-header">
          <button type="button" className="ranking-back-btn" onClick={onClose}>
            {t('common.back')}
          </button>
          <div className="ranking-title-wrap">
            <p className="ranking-kicker">JOBLESS SCORE BOARD</p>
            <h1 className="ranking-title">{t('ranking.title')}</h1>
          </div>
          <div className="ranking-header-actions">
            <button
              type="button"
              className="ranking-legend-btn"
              onClick={() => setLegendOpen(true)}
              aria-label="歴代覇者"
            >
              覇者
            </button>
            <button
              type="button"
              className="ranking-guide-btn"
              onClick={() => setGuideOpen(true)}
              aria-label="ポイント獲得方法"
            >
              POINT
            </button>
          </div>
        </header>

        <div className="ranking-job-tabs" role="tablist">
          {JOB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={jobId === tab.id}
              className={`ranking-job-tab ${jobId === tab.id ? 'ranking-job-tab--active' : ''}`}
              onClick={() => setJobId(tab.id)}
            >
              <span className="ranking-job-tab-icon" aria-hidden>{tab.icon}</span>
              <span className="ranking-job-tab-text">{getRankingTabLabel(tab, t)}</span>
            </button>
          ))}
        </div>

        <div className="ranking-body">
          <section className="ranking-command-card">
            <div className="ranking-command-top">
              <div>
                <p className="ranking-command-label">{activeJobNameRevealed ? activeJob.alias : 'LOCKED'}</p>
                <h2 className="ranking-command-title">
                  <span aria-hidden>{activeJob.icon}</span>
                  {activeTabLabel}
                </h2>
              </div>
              <div className="ranking-command-rank">
                <span>{myRankInList != null ? `#${myRankInList}` : '--'}</span>
                <small>{myRankInList != null ? rankLabel : '圏外'}</small>
              </div>
            </div>
            <p className="ranking-command-motto">
              {activeJobNameRevealed ? activeJob.motto : '未解放の職業ランキングです。'}
            </p>
            <p className="ranking-season-period">{seasonInfo.label} / {seasonInfo.statusLabel}: {seasonInfo.endLabel}</p>
            {masteryInfo && activeJobNameRevealed && (
              <div className="ranking-mastery-strip" aria-label="ジョブ熟練度">
                <div className="ranking-mastery-head">
                  <span>熟練度 Lv{masteryInfo.level}</span>
                  <strong>{masteryInfo.isMax ? 'MAX' : `${formatScore(masteryInfo.xp - masteryInfo.currentLevelXp)} / ${formatScore(masteryInfo.nextLevelXp - masteryInfo.currentLevelXp)} XP`}</strong>
                </div>
                <div className="ranking-mastery-bar" aria-hidden>
                  <span style={{ width: `${Math.round(masteryInfo.progress * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="ranking-score-strip" aria-label="スコア概要">
              <div className="ranking-score-chip">
                <span>TOP</span>
                <strong>{formatScore(leaderScore)}</strong>
              </div>
              <div className="ranking-score-chip ranking-score-chip--mine">
                <span>MY BEST</span>
                <strong>{formatScore(myScore)}</strong>
              </div>
            </div>
          </section>

          {!loading && !error && topRows.length > 0 && (
            <section className="ranking-podium" aria-label="上位3名">
              {topRows.map((row) => {
                const rowMasteryBadge = getRowMasteryBadgeView(row);
                return (
                  <article key={`podium-${jobId}-${row.rank}-${row.nickname}`} className={`ranking-podium-card ranking-podium-card--${row.rank}`}>
                    <span className="ranking-podium-rank">#{row.rank}</span>
                    <strong className="ranking-podium-name">
                      <ChampionBadgePill count={row.champion_count} />
                      {rowMasteryBadge && <MasteryBadgePill badge={rowMasteryBadge} />}
                      <span className="ranking-name-text">{row.nickname}</span>
                    </strong>
                    <span className="ranking-podium-score">{formatScore(row.score)} {t('ranking.pt')}</span>
                  </article>
                );
              })}
            </section>
          )}

          {loading ? (
            <p className="ranking-status">{t('ranking.loading')}</p>
          ) : error ? (
            <p className="ranking-status ranking-status--error">{error}</p>
          ) : rows.length === 0 ? (
            <p className="ranking-status">{t('ranking.empty')}</p>
          ) : (
            <div className="ranking-list">
              {displayRows.map((row, i) => {
                const rowMasteryBadge = getRowMasteryBadgeView(row);
                return (
                  <div
                    key={`${jobId}-${i}-${row.rank}`}
                    className={`ranking-row ${getRankClass(row.rank)} ${row.nickname === getStoredRankingNickname() ? 'ranking-row--me' : ''}`}
                  >
                    <span className="ranking-rank">#{row.rank}</span>
                    <span className="ranking-nickname">
                      <ChampionBadgePill count={row.champion_count} />
                      {rowMasteryBadge && <MasteryBadgePill badge={rowMasteryBadge} />}
                      <span className="ranking-name-text">{row.nickname}</span>
                    </span>
                    <span className="ranking-score">{formatScore(row.score)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="ranking-footer">
          <div className="ranking-footer-summary" aria-label={t('ranking.yourScore')}>
            <div className="ranking-footer-profile">
              <p className="ranking-footer-label">{t('ranking.yourScore')}</p>
              <span className="ranking-footer-nick">
                {selectedMasteryBadgeView && <MasteryBadgePill badge={selectedMasteryBadgeView} />}
                <span className="ranking-name-text">{myNickname}</span>
              </span>
              {!loading && !error && rows.length > 0 && (
                <span className="ranking-footer-rank">
                  {myRankInList != null
                    ? t('ranking.rankLine', { rank: myRankInList })
                    : t('ranking.outOfRank')}
                </span>
              )}
            </div>
            <strong className="ranking-footer-score">
              {formatScore(myScore)} {t('ranking.pt')}
            </strong>
            <button type="button" className="ranking-footer-badge-btn" onClick={() => setBadgePickerOpen(true)}>
              バッジ設定
            </button>
          </div>
        </footer>

        {badgePickerOpen && (
          <div className="ranking-guide-overlay" onClick={() => setBadgePickerOpen(false)}>
            <section className="ranking-guide-modal" onClick={(e) => e.stopPropagation()} aria-label="熟練度バッジ選択">
              <div className="ranking-guide-header">
                <div>
                  <p className="ranking-kicker">MASTERY BADGE</p>
                  <h2>表示バッジ選択</h2>
                </div>
                <button type="button" className="ranking-guide-close" onClick={() => setBadgePickerOpen(false)}>
                  {t('common.close')}
                </button>
              </div>
              <div className="ranking-badge-picker-body">
                <section className={`ranking-participation-panel ${rankingDisplayConsentEnabled ? 'ranking-participation-panel--enabled' : ''}`}>
                  <div>
                    <strong>{rankingDisplayConsentEnabled ? 'ランキング反映中' : 'ランキング未反映'}</strong>
                    <p>
                      {rankingDisplayConsentEnabled
                        ? '自己ベスト更新時にランキングへ反映されます。'
                        : '現在、名前とスコアはランキングに表示されません。熟練度XPは通常どおり獲得できます。'}
                    </p>
                  </div>
                  {!rankingDisplayConsentEnabled && (
                    <button type="button" onClick={enableRankingDisplay}>
                      次のランから反映する
                    </button>
                  )}
                </section>
                <section className="ranking-participation-panel ranking-name-change-panel">
                  <div>
                    <strong>ランキング名変更</strong>
                    <p>
                      現在: {getStoredRankingNickname() ?? '未設定'} / チケット: {nameChangeTicketCount}枚
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!getStoredRankingNickname() || nameChangeTicketCount <= 0 || nameChangeBusy}
                    onClick={openNameChangeModal}
                  >
                    {nameChangeTicketCount > 0 ? 'チケットで変更' : 'チケットなし'}
                  </button>
                </section>
                <button
                  type="button"
                  className={`ranking-badge-choice ${selectedMasteryBadge == null ? 'ranking-badge-choice--active' : ''}`}
                  onClick={() => selectMasteryBadge(null)}
                >
                  <span className="ranking-badge-choice-main">表示しない</span>
                  <small>ランキングの名前横にバッジを出しません。</small>
                </button>
                {unlockedMasteryBadges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    className={`ranking-badge-choice ${selectedMasteryBadge === badge.id ? 'ranking-badge-choice--active' : ''}`}
                    onClick={() => selectMasteryBadge(badge.id)}
                  >
                    <span className="ranking-badge-choice-title">
                      <MasteryBadgePill badge={badge} />
                      <span className="ranking-badge-choice-main">{badge.label}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="ranking-guide-note">
                バッジはランキングサーバーにも保存され、他の端末から見ても名前横に表示されます。
              </p>
            </section>
          </div>
        )}

        {nameChangeOpen && (
          <div className="ranking-guide-overlay" onClick={() => {
            if (!nameChangeBusy) setNameChangeOpen(false);
          }}>
            <section className="ranking-guide-modal ranking-guide-modal--compact" onClick={(e) => e.stopPropagation()} aria-label="ランキング名変更">
              <div className="ranking-guide-header">
                <div>
                  <p className="ranking-kicker">NAME CHANGE</p>
                  <h2>ランキング名変更</h2>
                </div>
                <button
                  type="button"
                  className="ranking-guide-close"
                  disabled={nameChangeBusy}
                  onClick={() => setNameChangeOpen(false)}
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="ranking-badge-picker-body">
                <p className="ranking-guide-note">チケット1枚を消費してランキング名を変更します。</p>
                <input
                  type="text"
                  className="ranking-name-change-input"
                  value={nameChangeDraft}
                  onChange={(e) => setNameChangeDraft(e.target.value)}
                  maxLength={RANKING_NICKNAME_MAX_LENGTH}
                  disabled={nameChangeBusy}
                  placeholder="例: カード職人"
                />
                {nameChangeError ? <p className="ranking-name-change-error">{nameChangeError}</p> : null}
                <button
                  type="button"
                  className="ranking-name-change-submit"
                  disabled={nameChangeBusy || nameChangeTicketCount <= 0}
                  onClick={() => void submitNameChange()}
                >
                  {nameChangeBusy ? '変更中…' : 'チケットを使って変更'}
                </button>
              </div>
            </section>
          </div>
        )}

        {guideOpen && (
          <div className="ranking-guide-overlay" onClick={() => setGuideOpen(false)}>
            <section className="ranking-guide-modal" onClick={(e) => e.stopPropagation()} aria-label="ポイント獲得方法">
              <div className="ranking-guide-header">
                <div>
                  <p className="ranking-kicker">POINT RULES</p>
                  <h2>ポイント獲得方法</h2>
                </div>
                <button type="button" className="ranking-guide-close" onClick={() => setGuideOpen(false)}>
                  {t('common.close')}
                </button>
              </div>
              <div className="ranking-guide-body">
                {RANKING_SCORE_GUIDE.map((section) => (
                  <div key={section.title} className="ranking-guide-section">
                    <h3>{section.title}</h3>
                    {section.rows.map(([label, value]) => (
                      <div key={`${section.title}-${label}`} className="ranking-guide-row">
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="ranking-guide-note">
                ラン終了時、そのランの合計ポイントが自己ベストを超えた場合のみランキングへ反映されます。
              </p>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
