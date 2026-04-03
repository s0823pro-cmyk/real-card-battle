import type { Enemy, EnemyIntent, PlayerState } from '../../types/game';
import { useState } from 'react';
import { ICONS } from '../../assets/icons';
import EnemyIntentView from './EnemyIntent';
import Tooltip from '../Tooltip/Tooltip';
import './Enemy.css';

interface Props {
  enemies: Enemy[];
  intents: Record<string, EnemyIntent>;
  hitEnemyId: string | null;
  /** ドラッグ中の予測ダメージ／残りHP（全体攻撃時は全敵分） */
  previewByEnemy?: Record<string, { damage: number; previewHp: number }> | null;
  /** ドラッグ中のデバフ付与後の行動予測用（敵ステータス仮想） */
  intentPreviewEnemyById?: Record<string, Enemy> | null;
  /** 物理攻撃がこのターン無効化される表示（0・ブロック系の色） */
  intentAttackDamageImmunity?: boolean;
  /** 無効化カードをドラッグ中のみインテント数値を点滅 */
  intentAttackDamageImmunityPulse?: boolean;
  /** 敵攻撃インテントにプレイヤーの脆弱（1.5倍）を反映 */
  player?: PlayerState;
  /** ドラッグ中のカードが敵に脆弱を付与するか（ダメージプレビュー時の敵ネーム点滅） */
  dragCardAppliesEnemyVulnerable?: boolean;
  /** ダメージ予測がない敵向けデバフカード：ホバー中の敵ID（ネーム灰色点滅） */
  enemyDebuffHintEnemyId?: string | null;
}

const EnemyDisplay = ({
  enemies,
  intents,
  hitEnemyId,
  previewByEnemy = null,
  intentPreviewEnemyById = null,
  intentAttackDamageImmunity = false,
  intentAttackDamageImmunityPulse = false,
  player,
  dragCardAppliesEnemyVulnerable = false,
  enemyDebuffHintEnemyId = null,
}: Props) => {
  const [failedImageEnemyIds, setFailedImageEnemyIds] = useState<Set<string>>(() => new Set());

  const getStatusValue = (enemy: Enemy, type: Enemy['statusEffects'][number]['type']): number =>
    enemy.statusEffects
      .filter((status) => status.type === type)
      .reduce((total, status) => total + status.value, 0);

  const layoutClass =
    enemies.length >= 3 ? 'enemy-list--3' : enemies.length === 2 ? 'enemy-list--2' : 'enemy-list--1';

  return (
    <section className={`enemy-list ${layoutClass}`}>
      {enemies.map((enemy) => {
        const previewInfo = previewByEnemy?.[enemy.id];
        const previewDamage = previewInfo?.damage ?? 0;
        const previewHp = previewInfo?.previewHp ?? 0;
        const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
        const hpClass = hpPercent < 33 ? 'low' : hpPercent < 66 ? 'mid' : 'high';
        const isPreviewTarget = Boolean(previewInfo && previewDamage > 0);
        const previewPercent = isPreviewTarget ? Math.max(0, (previewHp / enemy.maxHp) * 100) : hpPercent;
        const previewLossPercent = isPreviewTarget ? Math.max(0, hpPercent - previewPercent) : 0;
        const intent = intents[enemy.id];
        const strengthUp = getStatusValue(enemy, 'strength_up');
        const attackDown = getStatusValue(enemy, 'attack_down');
        const burn = getStatusValue(enemy, 'burn');
        const poison = getStatusValue(enemy, 'poison');
        const weak = getStatusValue(enemy, 'weak');
        const vulnerable = getStatusValue(enemy, 'vulnerable');
        const targetedClass = previewInfo
          ? previewDamage > 0
            ? 'enemy-card--targeted enemy-card--targeted-damage'
            : dragCardAppliesEnemyVulnerable
              ? 'enemy-card--targeted enemy-card--targeted-vulnerable-card'
              : 'enemy-card--targeted enemy-card--targeted-damage'
          : enemyDebuffHintEnemyId === enemy.id && enemy.currentHp > 0
            ? 'enemy-card--targeted enemy-card--targeted-debuff-hint'
            : '';
        return (
          <article
            key={enemy.id}
            className={`enemy-card ${enemy.currentHp <= 0 ? 'dead' : ''} ${
              hitEnemyId === enemy.id ? 'hit' : ''
            } ${targetedClass ?? ''}`}
            data-enemy-id={enemy.id}
          >
            <h3 className="enemy-name">{enemy.name}</h3>
            <div className="enemy-hp-top">
              <div className="enemy-hp-bar-container">
                <span className={`enemy-hp-bar-fill ${hpClass}`} style={{ width: `${hpPercent}%` }} />
                {isPreviewTarget && (
                  <span
                    className="enemy-hp-bar-preview"
                    style={{
                      width: `${previewLossPercent}%`,
                      left: `${previewPercent}%`,
                    }}
                  />
                )}
              </div>
              <div className="enemy-hp-text">
                <span className="enemy-hp-fraction">
                  <img
                    src={ICONS.hp}
                    alt="HP"
                    className="status-icon"
                    draggable={false}
                  />
                  <span
                    className={
                      isPreviewTarget
                        ? 'enemy-hp-num-single enemy-hp-num-single--preview'
                        : enemy.block > 0
                          ? 'enemy-hp-num-single enemy-hp-num-single--block'
                          : 'enemy-hp-num-single'
                    }
                  >
                    {isPreviewTarget ? previewHp + enemy.block : enemy.currentHp + enemy.block}
                  </span>
                </span>
              </div>
            </div>
            <div className="enemy-illustration">
              {enemy.imageUrl && !failedImageEnemyIds.has(enemy.id) ? (
                <img
                  src={enemy.imageUrl}
                  alt={enemy.name}
                  className="enemy-illustration-img"
                  draggable={false}
                  onError={() => {
                    setFailedImageEnemyIds((prev) => {
                      const next = new Set(prev);
                      next.add(enemy.id);
                      return next;
                    });
                  }}
                />
              ) : (
                <div className="enemy-icon">{enemy.icon ?? '👤'}</div>
              )}
            </div>
            {intent && enemy.currentHp > 0 && (
              <EnemyIntentView
                enemy={intentPreviewEnemyById?.[enemy.id] ?? enemy}
                intent={intent}
                isPreview={Boolean(intentPreviewEnemyById?.[enemy.id])}
                attackDamageImmunity={intentAttackDamageImmunity}
                attackDamageImmunityPulse={intentAttackDamageImmunityPulse}
                player={player ?? null}
              />
            )}
            <div className="enemy-status-effects">
              {strengthUp > 0 && (
                <span className="enemy-buff--positive">
                  <img src={ICONS.buff} alt="Buff" className="status-icon" />+{strengthUp}
                </span>
              )}
              {vulnerable > 0 && (
                <Tooltip label="脆弱" description={`受けるダメージ+50%。残り${vulnerable}ターン`}>
                  <span className="status-badge status-badge--vulnerable">
                    <img src={ICONS.badgeVulnerable} alt="" className="debuff-icon" />
                    {vulnerable}
                  </span>
                </Tooltip>
              )}
              {weak > 0 && (
                <Tooltip label="弱体" description={`与えるダメージが25％減少。残り${weak}ターン`}>
                  <span className="status-badge status-badge--weak">
                    <img src={ICONS.badgeWeak} alt="" className="debuff-icon" />
                    {weak}
                  </span>
                </Tooltip>
              )}
              {burn > 0 && (
                <Tooltip
                  label="火傷"
                  description={`ターン終了時に残りターン数（${burn}）と同じダメージ。ターンごとに1減る`}
                >
                  <span className="status-badge status-badge--burn">
                    <img src={ICONS.badgeBurn} alt="" className="debuff-icon" />
                    {burn}
                  </span>
                </Tooltip>
              )}
              {poison > 0 && (
                <Tooltip
                  label="毒"
                  description={`ターン終了時に残りHPの5%（切り上げ）のダメージ。残り${poison}ターン`}
                >
                  <span className="status-badge status-badge--poison" aria-hidden>
                    ☠️
                    {poison}
                  </span>
                </Tooltip>
              )}
              {attackDown > 0 && (
                <Tooltip label="攻撃デバフ" description={`攻撃力-${attackDown}（このターンのみ）`}>
                  <span className="status-badge status-badge--debuff">
                    <img src={ICONS.badgeAttackDown} alt="" className="debuff-icon" />
                    {attackDown}
                  </span>
                </Tooltip>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
};

export default EnemyDisplay;
