import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import CardComponent from '../Hand/CardComponent';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import type { ChampionReward } from '../../utils/rankingClient';
import { getRankingChampionBadgeImage } from '../../data/badgeImages';
import { SONNA_DAIKU_CARD } from '../../data/legendaryRewardCards';
import './ChampionRewardModal.css';

const STATIC_VALUES: EffectiveCardValues = {
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

const noop = (): void => {};
const noopPointer = (_event: ReactPointerEvent): void => {
  void _event;
};

const getCardValues = (): EffectiveCardValues => ({
  ...STATIC_VALUES,
  block: SONNA_DAIKU_CARD.block ?? null,
  effectiveTimeCost: SONNA_DAIKU_CARD.timeCost,
});

function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toLocaleString();
}

interface ChampionRewardModalProps {
  reward: ChampionReward | null;
  onClose: () => void;
}

export const ChampionRewardModal = ({ reward, onClose }: ChampionRewardModalProps) => {
  if (!reward) return null;
  const badgeImage = getRankingChampionBadgeImage(reward.champion_count);

  return createPortal(
    <div className="champion-reward-overlay" role="dialog" aria-modal="true">
      <section className="champion-reward-modal">
        <p className="champion-reward-kicker">CHAMPION REWARD</p>
        <h2 className="champion-reward-title">優勝おめでとうございます</h2>
        <p className="champion-reward-desc">
          {reward.season_label}で総合1位になりました。
          <br />
          覇者バッジと記念カードが解放されました。
        </p>

        <div className="champion-reward-summary">
          <div>
            <span>優勝名</span>
            <strong>{reward.nickname}</strong>
          </div>
          <div>
            <span>最終ポイント</span>
            <strong>{formatScore(reward.score)} pt</strong>
          </div>
        </div>

        <div className="champion-reward-items">
          <div className="champion-reward-badge-card">
            <span className="champion-reward-item-label">覇者バッジ</span>
            {badgeImage ? (
              <img className="champion-reward-badge-img" src={badgeImage} alt="覇者バッジ" />
            ) : (
              <span className="champion-reward-badge-fallback" aria-hidden>🏆</span>
            )}
            <strong>覇者Ⅰ</strong>
          </div>

          <div
            className="champion-reward-card-wrap"
            style={{ '--hand-card-width': '176px', '--hand-card-height': '280px' } as CSSProperties}
          >
            <CardComponent
              card={SONNA_DAIKU_CARD}
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
              effectiveValues={getCardValues()}
              onSelect={noop}
              onPointerDown={noopPointer}
              onPointerMove={noopPointer}
              onPointerUp={noopPointer}
              onPointerCancel={noop}
              onMouseEnter={noop}
              onMouseLeave={noop}
            />
          </div>
        </div>

        <button type="button" className="champion-reward-close" onClick={onClose}>
          受け取る
        </button>
      </section>
    </div>,
    document.body,
  );
};
