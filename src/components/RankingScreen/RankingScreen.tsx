import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import {
  fetchRanking,
  getLocalRankingScore,
  getStoredRankingNickname,
  type RankingRow,
} from '../../utils/rankingClient';
import './RankingScreen.css';

type RankingTabJobId = 'carpenter' | 'cook';

const JOB_TABS: { id: RankingTabJobId; labelKey: MessageKey; icon: string }[] = [
  { id: 'carpenter', labelKey: 'job.carpenter.name', icon: '🔨' },
  { id: 'cook', labelKey: 'job.cook.name', icon: '🔪' },
];

interface RankingScreenProps {
  onClose: () => void;
}

export function RankingScreen({ onClose }: RankingScreenProps) {
  const { t } = useLanguage();
  const { playBgm } = useAudioContext();
  const [jobId, setJobId] = useState<RankingTabJobId>('carpenter');
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    playBgm('menu');
  }, [playBgm]);

  const load = useCallback(async (jid: RankingTabJobId) => {
    setLoading(true);
    setError(null);
    const data = await fetchRanking(jid);
    if (!data) {
      setRows([]);
      setError(t('ranking.errorLoad'));
    } else {
      setRows(data.ranking.slice(0, 100));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load(jobId);
  }, [jobId, load]);

  const myNickname = getStoredRankingNickname() ?? t('ranking.unsetNickname');
  const myScore = getLocalRankingScore(jobId);

  const myRankInList = useMemo(() => {
    const nick = getStoredRankingNickname();
    if (!nick) return null;
    const idx = rows.findIndex((r) => r.nickname === nick);
    if (idx < 0) return null;
    return rows[idx].rank;
  }, [rows]);

  return (
    <div className="ranking-overlay" onClick={onClose}>
      <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
        <header className="ranking-header">
          <button type="button" className="ranking-back-btn" onClick={onClose}>
            {t('common.back')}
          </button>
          <h1 className="ranking-title">{t('ranking.title')}</h1>
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
              {tab.icon} {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="ranking-body">
          {loading ? (
            <p className="ranking-status">{t('ranking.loading')}</p>
          ) : error ? (
            <p className="ranking-status ranking-status--error">{error}</p>
          ) : rows.length === 0 ? (
            <p className="ranking-status">{t('ranking.empty')}</p>
          ) : (
            <div className="ranking-list">
              {rows.map((row, i) => (
                <div key={`${jobId}-${i}-${row.rank}`} className="ranking-row">
                  <span className="ranking-rank">{row.rank}</span>
                  <span className="ranking-nickname">{row.nickname}</span>
                  <span className="ranking-score">
                    {row.score.toLocaleString()} {t('ranking.pt')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="ranking-footer">
          <p className="ranking-footer-label">{t('ranking.yourScore')}</p>
          <div className="ranking-footer-row">
            <span className="ranking-footer-nick">{myNickname}</span>
            <span className="ranking-footer-score">
              {myScore.toLocaleString()} {t('ranking.pt')}
            </span>
          </div>
          {!loading && !error && rows.length > 0 && (
            <p className="ranking-footer-rank">
              {myRankInList != null
                ? t('ranking.rankLine', { rank: myRankInList })
                : t('ranking.outOfRank')}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
