import type { Enemy, EnemyIntent } from '../../types/game';
import { useState } from 'react';
import EnemyIntentView from './EnemyIntent';
import Tooltip from '../Tooltip/Tooltip';
import './Enemy.css';

interface Props {
  enemies: Enemy[];
  intents: Record<string, EnemyIntent>;
  hitEnemyId: string | null;
  previewTargetEnemyId?: string | null;
  previewDamage?: number;
  previewHp?: number;
}

const EnemyDisplay = ({
  enemies,
  intents,
  hitEnemyId,
  previewTargetEnemyId = null,
  previewDamage = 0,
  previewHp = 0,
}: Props) => {
  const [failedImageEnemyIds, setFailedImageEnemyIds] = useState<Set<string>>(() => new Set());

  const getStatusValue = (enemy: Enemy, type: Enemy['statusEffects'][number]['type']): number =>
    enemy.statusEffects
      .filter((status) => status.type === type)
      .reduce((total, status) => total + status.value, 0);

  return (
    <section className="enemy-list">
      {enemies.map((enemy) => {
        const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
        const hpClass = hpPercent < 33 ? 'low' : hpPercent < 66 ? 'mid' : 'high';
        const isPreviewTarget = previewTargetEnemyId === enemy.id && previewDamage > 0;
        const previewPercent = isPreviewTarget ? Math.max(0, (previewHp / enemy.maxHp) * 100) : hpPercent;
        const previewLossPercent = isPreviewTarget ? Math.max(0, hpPercent - previewPercent) : 0;
        const intent = intents[enemy.id];
        const strengthUp = getStatusValue(enemy, 'strength_up');
        const attackDown = getStatusValue(enemy, 'attack_down');
        const burn = getStatusValue(enemy, 'burn');
        const weak = getStatusValue(enemy, 'weak');
        const vulnerable = getStatusValue(enemy, 'vulnerable');
        return (
          <article
            key={enemy.id}
            className={`enemy-card ${enemy.currentHp <= 0 ? 'dead' : ''} ${
              hitEnemyId === enemy.id ? 'hit' : ''
            } ${previewTargetEnemyId === enemy.id ? 'enemy-card--targeted' : ''}`}
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
                {enemy.block > 0 ? (
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                    🛡 {enemy.currentHp + enemy.block}/{enemy.maxHp}
                  </span>
                ) : (
                  <span>
                    ❤ {enemy.currentHp}/{enemy.maxHp}
                  </span>
                )}
                {isPreviewTarget && <span className="enemy-hp-preview-text">→ {previewHp}</span>}
              </div>
            </div>
            <div className="enemy-buffs">
              {strengthUp > 0 && <span className="enemy-buff--positive">⬆️+{strengthUp}</span>}
            </div>
            <div className="enemy-illustration">
              {enemy.imageUrl && !failedImageEnemyIds.has(enemy.id) ? (
                <img
                  src={enemy.imageUrl}
                  alt={enemy.name}
                  className="enemy-illustration-img"
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
            {intent && enemy.currentHp > 0 && <EnemyIntentView enemy={enemy} intent={intent} />}
            <div className="enemy-status-effects">
              {vulnerable > 0 && (
                <Tooltip label="脆弱" description={`受けるダメージ+50%。残り${vulnerable}ターン`}>
                  <span className="status-badge status-badge--vulnerable">💧{vulnerable}</span>
                </Tooltip>
              )}
              {weak > 0 && (
                <Tooltip label="弱体" description={`与えるダメージ-25%。残り${weak}ターン`}>
                  <span className="status-badge status-badge--weak">⬇️{weak}</span>
                </Tooltip>
              )}
              {burn > 0 && (
                <Tooltip label="火傷" description={`ターン終了時に${burn}ダメージ`}>
                  <span className="status-badge status-badge--burn">🔥{burn}</span>
                </Tooltip>
              )}
              {attackDown > 0 && (
                <Tooltip label="攻撃デバフ" description={`攻撃力-${attackDown}（このターンのみ）`}>
                  <span className="status-badge status-badge--debuff">🔽{attackDown}</span>
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
