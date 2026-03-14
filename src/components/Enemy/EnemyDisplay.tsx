import type { Enemy, EnemyIntent } from '../../types/game';
import EnemyIntentView from './EnemyIntent';
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
  return (
    <section className="enemy-list">
      {enemies.map((enemy) => {
        const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
        const hpClass = hpPercent < 33 ? 'low' : hpPercent < 66 ? 'mid' : 'high';
        const isPreviewTarget = previewTargetEnemyId === enemy.id && previewDamage > 0;
        const previewPercent = isPreviewTarget ? Math.max(0, (previewHp / enemy.maxHp) * 100) : hpPercent;
        const previewLossPercent = isPreviewTarget ? Math.max(0, hpPercent - previewPercent) : 0;
        const intent = intents[enemy.id];
        const strengthUp = enemy.statusEffects.find((status) => status.type === 'strength_up')?.value ?? 0;
        const attackDown = enemy.statusEffects.find((status) => status.type === 'attack_down')?.value ?? 0;
        const burn = enemy.statusEffects.find((status) => status.type === 'burn')?.value ?? 0;
        const weak = enemy.statusEffects.find((status) => status.type === 'weak')?.value ?? 0;
        const vulnerable = enemy.statusEffects.find((status) => status.type === 'vulnerable')?.value ?? 0;
        return (
          <article
            key={enemy.id}
            className={`enemy-card ${enemy.currentHp <= 0 ? 'dead' : ''} ${
              hitEnemyId === enemy.id ? 'hit' : ''
            } ${previewTargetEnemyId === enemy.id ? 'enemy-card--targeted' : ''}`}
            data-enemy-id={enemy.id}
          >
            {intent && enemy.currentHp > 0 && <EnemyIntentView enemy={enemy} intent={intent} />}
            <div className="enemy-buffs">
              {strengthUp > 0 && <span className="enemy-buff--positive">⬆️+{strengthUp}</span>}
            </div>
            {enemy.imageUrl ? (
              <img src={enemy.imageUrl} alt={enemy.name} className="enemy-image" />
            ) : (
              <div className="enemy-icon">{enemy.icon ?? '👤'}</div>
            )}
            <h3>{enemy.name}</h3>
            <p className="enemy-hp-label enemy-hp-text">
              <span>
                ❤ {enemy.currentHp}/{enemy.maxHp}
              </span>
              {isPreviewTarget && <span className="enemy-hp-preview-text">→ {previewHp}</span>}
            </p>
            <div className="enemy-hp-track enemy-hp-bar-container">
              <span className={`enemy-hp-fill ${hpClass}`} style={{ width: `${hpPercent}%` }} />
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
            <div className="enemy-debuffs">
              {burn > 0 && <span className="enemy-debuff">🔥{burn}</span>}
              {vulnerable > 0 && <span className="enemy-debuff">💧{vulnerable}</span>}
              {weak > 0 && <span className="enemy-debuff">🔽{weak}</span>}
              {attackDown > 0 && <span className="enemy-debuff">📉{attackDown}</span>}
            </div>
          </article>
        );
      })}
    </section>
  );
};

export default EnemyDisplay;
