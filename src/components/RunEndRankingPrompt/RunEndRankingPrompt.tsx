import { useCallback, useMemo, useState } from 'react';
import type { JobId } from '../../types/game';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getStoredRankingNickname,
  getUnsubmittedRankingScore,
  nicknameCharLength,
  postRankingNickname,
  RANKING_NICKNAME_MAX_LENGTH,
  RANKING_NICKNAME_MIN_LENGTH,
} from '../../utils/rankingClient';
import './RunEndRankingPrompt.css';

interface RunEndRankingPromptProps {
  jobId: JobId;
  onOpenRanking: () => void;
}

export const RunEndRankingPrompt = ({ jobId, onOpenRanking }: RunEndRankingPromptProps) => {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasNickname = getStoredRankingNickname() !== null;
  const unsubmittedScore = useMemo(() => getUnsubmittedRankingScore(jobId), [jobId]);

  const handleSubmit = useCallback(async () => {
    const len = nicknameCharLength(draft);
    if (len < RANKING_NICKNAME_MIN_LENGTH || len > RANKING_NICKNAME_MAX_LENGTH) {
      setError(t('home.ranking.errLength'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postRankingNickname(draft, consent);
    setBusy(false);
    if (!res.ok) {
      const err = res.error;
      if (err === 'network') setError(t('home.ranking.errNetwork'));
      else if (err === 'nickname_not_allowed') setError(t('home.ranking.errNickname'));
      else if (err === 'nickname_taken') setError(t('home.ranking.errNicknameTaken'));
      else if (err === 'nickname_length') setError(t('home.ranking.errLength'));
      else setError(t('home.ranking.errRegister'));
      return;
    }
    setModalOpen(false);
    onOpenRanking();
  }, [consent, draft, onOpenRanking, t]);

  if (unsubmittedScore <= 0) return null;

  return (
    <>
      <section className="run-end-ranking-prompt" aria-label={t('runEndRanking.aria')}>
        <div className="run-end-ranking-prompt-main">
          <span className="run-end-ranking-prompt-icon">🏆</span>
          <div>
            <p className="run-end-ranking-prompt-title">
              {hasNickname ? t('runEndRanking.openTitle') : t('runEndRanking.nicknameTitle')}
            </p>
            <p className="run-end-ranking-prompt-desc">
              {hasNickname ? t('runEndRanking.openDesc') : t('runEndRanking.nicknameDesc')}
            </p>
            <p className="run-end-ranking-prompt-score">{t('runEndRanking.score', { n: unsubmittedScore })}</p>
          </div>
        </div>
        <button
          type="button"
          className="run-end-ranking-prompt-button"
          onClick={() => {
            if (hasNickname) {
              onOpenRanking();
              return;
            }
            setDraft('');
            setConsent(false);
            setError(null);
            setModalOpen(true);
          }}
        >
          {hasNickname ? t('runEndRanking.openRanking') : t('runEndRanking.register')}
        </button>
      </section>

      {modalOpen && (
        <div
          className="run-end-ranking-modal-overlay"
          onClick={() => {
            if (!busy) setModalOpen(false);
          }}
        >
          <div className="run-end-ranking-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('home.ranking.modalTitle')}</h2>
            <p className="run-end-ranking-modal-desc">{t('runEndRanking.nicknameDesc')}</p>
            <p className="run-end-ranking-modal-desc">{t('home.ranking.cardNameNotice')}</p>
            <input
              type="text"
              className="run-end-ranking-modal-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={RANKING_NICKNAME_MAX_LENGTH}
              autoComplete="username"
              placeholder={t('home.ranking.placeholder')}
              disabled={busy}
            />
            <label className="run-end-ranking-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                ランキングにこの名前とスコアを表示することに同意します。
                <small>チェックしない場合、このランのスコアはランキングへ送信されません。熟練度XPは獲得済みです。</small>
              </span>
            </label>
            {error ? <p className="run-end-ranking-modal-error">{error}</p> : null}
            <p className="run-end-ranking-modal-notice">{t('home.ranking.notice')}</p>
            <div className="run-end-ranking-modal-actions">
              <button type="button" className="run-end-ranking-modal-cancel" disabled={busy} onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="run-end-ranking-modal-submit" disabled={busy} onClick={() => void handleSubmit()}>
                {busy ? t('home.ranking.submitting') : t('home.ranking.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
