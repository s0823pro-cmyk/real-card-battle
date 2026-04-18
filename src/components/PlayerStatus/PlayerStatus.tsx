import { useState } from 'react';
import type { Card, PlayerState, ToolSlot } from '../../types/game';
import type { RunItem } from '../../types/run';
import type { HungryState } from '../../utils/hungrySystem';
import type { CookingFullnessPreview } from '../../utils/cardPreview';
import { ICONS } from '../../assets/icons';
import ToolSlots from './ToolSlots';
import Tooltip from '../Tooltip/Tooltip';
import './PlayerStatus.css';

interface Props {
  player: PlayerState;
  previewBlock?: number | null;
  /** ダメージ無効カードをドラッグ中：ブロック数はそのまま、金色で無敵プレビュー */
  previewBlockImmunity?: boolean;
  previewHp?: number | null;
  previewScaffold?: number | null;
  /** 調理職：カード使用後の調理・満腹ゲージ予測 */
  cookingFullnessPreview?: CookingFullnessPreview | null;
  toolSlots: ToolSlot[];
  activePowers: Card[];
  battleItems: RunItem[];
  canUseItems: boolean;
  onUseItem: (itemId: string) => void;
  onEndTurn: () => void;
  isTurnEnding: boolean;
  drawPileCount: number;
  discardPileCount: number;
  isPlayerHit: boolean;
  isPreparationActive?: boolean;
  hungryState?: HungryState;
  onOpenDrawPile?: () => void;
  onOpenDiscardPile?: () => void;
}

const PlayerStatus = ({
  player,
  previewBlock = null,
  previewBlockImmunity = false,
  previewHp = null,
  previewScaffold = null,
  cookingFullnessPreview = null,
  toolSlots,
  activePowers,
  battleItems,
  canUseItems,
  onUseItem,
  onEndTurn,
  isTurnEnding,
  drawPileCount,
  discardPileCount,
  isPlayerHit,
  isPreparationActive = false,
  hungryState = 'normal',
  onOpenDrawPile,
  onOpenDiscardPile,
}: Props) => {
  const displayCurrentHp = previewHp != null ? previewHp : player.currentHp;
  const hpRatio = displayCurrentHp / Math.max(1, player.maxHp);
  const hpColorClass =
    hpRatio <= 0.3 ? 'hp-critical' : hpRatio <= 0.5 ? 'hp-warning' : '';
  const awakeThreshold = Math.floor(player.maxHp * 0.3);
  const remainingToAwake = Math.max(0, player.currentHp - awakeThreshold);
  const unemployedLabel =
    hungryState === 'awakened' ? '⚡ 覚醒' : `💢 ${remainingToAwake}`;
  const unemployedClass =
    hungryState === 'awakened'
      ? 'awakened-state'
      : hungryState === 'hungry'
        ? 'hungry-state'
        : 'normal-awake-state';
  const blockClass = player.block > 0 ? 'status-block--active' : 'status-block--zero';
  const showBlockImmunityPreview = previewBlockImmunity;
  const showBlockNumberPreview = previewBlock != null;
  const blockPreviewActive = showBlockNumberPreview || showBlockImmunityPreview;
  const showCookingGaugePreview =
    cookingFullnessPreview != null && cookingFullnessPreview.cookingFrom !== cookingFullnessPreview.cookingTo;
  const showFullnessGaugePreview =
    cookingFullnessPreview != null &&
    (cookingFullnessPreview.fullnessFrom !== cookingFullnessPreview.fullnessTo ||
      cookingFullnessPreview.fullnessTriggerHint);
  const [itemConfirm, setItemConfirm] = useState<RunItem | null>(null);
  const itemSlotsRow = (
    <div className="stat-items stat-items--sub-row">
      {Array.from({ length: 3 }).map((_, idx) => {
        const item = battleItems[idx];
        return (
          <Tooltip
            key={`item-${idx}`}
            label={item?.name ?? 'アイテム'}
            description={item?.description ?? '戦闘で使えるアイテム'}
          >
            <button
              type="button"
              className={`item-slot ${item ? 'filled' : ''}`}
              disabled={!item || !canUseItems}
              onClick={() => {
                if (item && canUseItems) setItemConfirm(item);
              }}
            >
              {item ? (
                item.imageUrl ? (
                  <img className="item-slot-image" src={item.imageUrl} alt={item.name} draggable={false} />
                ) : (
                  <span className="item-emoji">{item.icon ?? '🧪'}</span>
                )
              ) : (
                ''
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <section className={`player-status ${isPlayerHit ? 'player-hit' : ''}`}>
      <div className="player-row player-row--top">
        <div className="player-main-stats">
          <div className="player-stat-left-cluster">
            <div className="player-hp-block-column">
              <div className="player-hp-row">
                <Tooltip tooltipKey="hp">
                  <span className={`hp ${hpColorClass}`}>
                    <img src={ICONS.hp} alt="HP" className="status-icon" draggable={false} />
                    <span className="hp-value">
                      <span
                        className={`hp-value-current${previewHp != null ? ' stat-value-preview stat-value-preview--hp' : ''}`}
                      >
                        {displayCurrentHp}
                      </span>
                    </span>
                  </span>
                </Tooltip>
              </div>
              <div className="player-block-row">
                <Tooltip tooltipKey="block">
                  <span
                    className={`block ${blockClass} ${blockPreviewActive ? 'block--preview' : ''}${
                      showBlockImmunityPreview ? ' block--immunity-preview' : ''
                    }`}
                  >
                    <img src={ICONS.block} alt="Block" className="status-icon" draggable={false} />
                    <span
                      className={`block-value${
                        showBlockImmunityPreview
                          ? ' stat-value-preview stat-value-preview--immunity'
                          : showBlockNumberPreview
                            ? ' stat-value-preview stat-value-preview--block'
                            : ''
                      }`}
                    >
                      {showBlockNumberPreview ? previewBlock : player.block}
                    </span>
                  </span>
                </Tooltip>
              </div>
            </div>
            {(player.ridgepoleActive || player.templeCarpenterActive) && (
              <div className="player-block-buff-icons">
                {player.ridgepoleActive && (
                  <Tooltip label="🎌 棟上げ" description="足場5以上で毎ターン全敵10ダメージ">
                    <span className="status-ridgepole">🎌</span>
                  </Tooltip>
                )}
                {player.templeCarpenterActive && (
                  <Tooltip label="🏯 宮大工の技" description="段取りボーナスが+50%に強化">
                    <span className="status-temple">🏯</span>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <div className="player-info-row-icons">
            {player.jobId === 'unemployed' && (
              <Tooltip tooltipKey="hungry">
                <span className={unemployedClass}>{unemployedLabel}</span>
              </Tooltip>
            )}
            {player.concentrationActive && (
              <Tooltip label="🎯 集中" description="次の攻撃・スキル1枚の数値効果が1.5倍（1回限り）">
                <span className="status-concentration">🎯</span>
              </Tooltip>
            )}
            {player.deathWishActive && (
              <Tooltip label="💀 デスウィッシュ" description="HP回復無効。全アタック+4ダメージ">
                <span className="status-death-wish">💀</span>
              </Tooltip>
            )}
            {player.cliffEdgeActive && (
              <Tooltip label="⚡ 崖っぷちの底力" description="覚醒中：毎ターン2ドロー + タイムバー+1秒">
                <span className="status-cliff-edge">⚡</span>
              </Tooltip>
            )}
          </div>
        </div>
        <ToolSlots toolSlots={toolSlots} activePowers={activePowers} jobId={player.jobId} />
      </div>
      <div className="player-row player-row--sub">
        {player.jobId === 'carpenter' && (
          <Tooltip tooltipKey="scaffold">
            <span
              key={`scaffold-${player.scaffold}`}
              className={`scaffold scaffold-bounce scaffold--sub-row${previewScaffold != null ? ' scaffold--preview' : ''}`}
            >
              <span className="scaffold-icon" aria-hidden>
                🏗️
              </span>
              <span
                className={`scaffold-value${previewScaffold != null ? ' stat-value-preview stat-value-preview--scaffold' : ''}`}
              >
                {previewScaffold != null ? previewScaffold : player.scaffold}
              </span>
            </span>
          </Tooltip>
        )}
        {player.jobId === 'cook' && (
          <>
            <Tooltip tooltipKey="cooking">
              <span
                key={`cook-${player.cookingGauge}`}
                className={`cooking-gauge cooking-gauge--sub-row scaffold-bounce${
                  showCookingGaugePreview ? ' cooking-gauge--preview' : ''
                }`}
              >
                <span className="cooking-gauge-icon" aria-hidden>
                  🍳
                </span>
                <span className="cooking-gauge-value">
                  {showCookingGaugePreview && cookingFullnessPreview ? (
                    <span className="stat-value-preview stat-value-preview--cooking">
                      {cookingFullnessPreview.cookingTo}
                    </span>
                  ) : (
                    player.cookingGauge
                  )}
                </span>
              </span>
            </Tooltip>
            <Tooltip tooltipKey="fullness">
              <span
                key={`fullness-${player.fullnessGauge}`}
                className={`fullness-gauge fullness-gauge--sub-row scaffold-bounce${
                  showFullnessGaugePreview ? ' fullness-gauge--preview' : ''
                }`}
              >
                <span className="fullness-gauge-icon" aria-hidden>
                  🍖
                </span>
                <span className="fullness-gauge-value">
                  {showFullnessGaugePreview && cookingFullnessPreview ? (
                    <>
                      <span className="stat-value-preview stat-value-preview--fullness">
                        {cookingFullnessPreview.fullnessTo}
                      </span>
                      {cookingFullnessPreview.fullnessTriggerHint && (
                        <span className="gauge-preview-trigger">(発動!)</span>
                      )}
                    </>
                  ) : (
                    player.fullnessGauge
                  )}
                </span>
              </span>
            </Tooltip>
          </>
        )}
        <div className="player-sub-spacer" />
        <div className="player-sub-prep-items">
          {/* アイテム枠は常に同じ位置（段取りは absolute で左に重ね、幅を取らない） */}
          <div className="player-sub-item-slots-wrap">{itemSlotsRow}</div>
          {isPreparationActive && (
            <div className="stat-preparation stat-preparation--next-to-items">
              <Tooltip
                label="⚡ 段取りボーナス"
                description="直前に【準備】バッジのカードを使用。次のカードのダメージ・ブロック・回復が1.2倍"
              >
                <span className="stat-preparation-text" aria-label="段取りボーナス">
                  ⚡
                </span>
              </Tooltip>
            </div>
          )}
        </div>
        <div className="stat-piles">
          <button type="button" className="btn-pile" onClick={onOpenDrawPile}>
            山:{drawPileCount}
          </button>
          <button type="button" className="btn-pile" onClick={onOpenDiscardPile}>
            捨:{discardPileCount}
          </button>
          <button
            type="button"
            className="btn-turn-end-inline"
            disabled={isTurnEnding}
            onClick={(event) => {
              event.stopPropagation();
              onEndTurn();
            }}
          >
            終了
          </button>
        </div>
      </div>
      {itemConfirm && (
        <div className="reserve-confirm-overlay">
          <div className="reserve-confirm-dialog">
            <p className="reserve-confirm-title">「{itemConfirm.name}」を使用しますか？</p>
            <p className="reserve-confirm-note">{itemConfirm.description}</p>
            <div className="reserve-confirm-buttons">
              <button type="button" className="btn-reserve-cancel" onClick={() => setItemConfirm(null)}>
                キャンセル
              </button>
              <button
                type="button"
                className="btn-reserve-ok"
                onClick={() => {
                  onUseItem(itemConfirm.id);
                  setItemConfirm(null);
                }}
              >
                使用する
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlayerStatus;
