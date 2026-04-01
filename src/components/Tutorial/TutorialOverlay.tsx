import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import './TutorialOverlay.css';

export interface TutorialOverlayProps {
  step:
    | 'job_select'
    | 'battle_hand'
    | 'battle_reserve'
    | 'battle_equipment'
    | 'battle_power'
    | 'battle_attack'
    | 'battle_skill';
  onNext: () => void;
  onSkip: () => void;
}

const STEP_CONFIG: Record<
  TutorialOverlayProps['step'],
  {
    message: string;
    highlightSelector: string;
    /** ハイライト枠を下へずらす（.hand-area は margin 負けで座標だけでは見た目が動きにくいため transform で指定） */
    spotlightTranslateY?: number;
    /** スポットライトの高さを上下に広げる量（片側 px、上下で 2 倍加算） */
    spotlightExpandY?: number;
  }
> = {
  job_select: {
    message: '職業を選んでください。\nカードを上にドラッグ！',
    /** 扇状に並ぶ職業カード全体を含む手札エリアをハイライト */
    highlightSelector: '.job-hand-area',
  },
  battle_hand: {
    message: 'これが手札です。\nカードをドラッグして使います',
    highlightSelector: '.hand-area',
    spotlightTranslateY: 64,
  },
  battle_reserve: {
    message: '温存枠：カードをここに置くと\n次ターン強化されます',
    highlightSelector: '.reserve-slot',
  },
  battle_equipment: {
    message: '攻撃とスキルに慣れたら、\nツールカードをここにドラッグして装備します',
    highlightSelector: '.equipment-slot',
  },
  battle_power: {
    message: '装備のあとはパワーカード。\nここにドラッグで恒久効果を発動します',
    highlightSelector: '.power-slot',
  },
  battle_attack: {
    message: 'アタックカード：敵にドラッグして\nダメージを与えます！',
    highlightSelector: '.enemy-area',
    /** ハイライトをやや下に（見た目の敵エリアに合わせる） */
    spotlightTranslateY: 48,
    /** スポットライトの縦拡張（アタックは枠をややタイトに） */
    spotlightExpandY: 6,
  },
  battle_skill: {
    message: 'スキルカード：タイムバーに\nドラッグして発動します',
    highlightSelector: '.time-bar',
  },
};

/** 中央吹き出し（.tutorial-top-panel--center の transform 前提）と揃えた縦位置 */
const TUTORIAL_PANEL_CENTER_OFFSET_PX = 120;

/** 敵スポット下端〜吹き出し上端の中点から、ガイドを少し上へ */
const ATTACK_ARROW_NUDGE_UP_PX = 52;

const ATTACK_GUIDE_SVG_WIDTH = 22;
const ATTACK_GUIDE_SVG_HEIGHT = 44;

/** ハイライト上＋中心 X：斜め回転はせず横（←→）か縦（↑↓）のみ（温存・装備・パワー・タイムバーで共通） */
function slotHighlightArrowProps(rect: { top: number; left: number; width: number; height: number }): {
  glyph: string;
  style: CSSProperties;
} {
  const vw = window.innerWidth;
  const panelCenterY = window.innerHeight / 2 - TUTORIAL_PANEL_CENTER_OFFSET_PX;
  const bubbleBottomY = panelCenterY + 44;
  const centerX = vw / 2;
  const slotCx = rect.left + rect.width / 2;
  const slotCy = rect.top + rect.height / 2;
  const dx = slotCx - centerX;
  const dy = slotCy - bubbleBottomY;

  /** ハイライト枠の水平中心 */
  const towardSlotX = slotCx;
  /** 枠の上端より少し上（translate(-50%,-50%) の基準＝矢印の中心） */
  const aboveSlotY = rect.top - 24;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      glyph: dx < 0 ? '←' : '→',
      style: {
        left: towardSlotX,
        top: aboveSlotY,
        transform: 'translate(-50%, -50%)',
      },
    };
  }
  return {
    glyph: dy < 0 ? '↑' : '↓',
    style: {
      left: towardSlotX,
      top: aboveSlotY,
      transform: 'translate(-50%, -50%)',
    },
  };
}

export const TutorialOverlay = ({ step, onNext, onSkip }: TutorialOverlayProps) => {
  const { message, spotlightTranslateY = 0, spotlightExpandY = 0 } = STEP_CONFIG[step];
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  /** アタック：固定サイズ SVG の縦中心（画面中央 X は CSS で 50%） */
  const [attackGuideAnchorY, setAttackGuideAnchorY] = useState<number | null>(null);

  const updateRect = useCallback(() => {
    const { highlightSelector } = STEP_CONFIG[step];
    const el = document.querySelector(highlightSelector);
    if (!el || !(el instanceof HTMLElement)) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top,
      left: r.left,
      width: Math.max(r.width, 8),
      height: Math.max(r.height, 8),
    });
  }, [step]);

  useLayoutEffect(() => {
    updateRect();
  }, [step, updateRect]);

  useLayoutEffect(() => {
    if (step !== 'battle_attack' || !rect) {
      setAttackGuideAnchorY(null);
      return;
    }
    const measure = () => {
      const bubble = document.querySelector(
        '.tutorial-top-panel.tutorial-top-panel--attack .tutorial-text-bubble',
      );
      if (!bubble) {
        setAttackGuideAnchorY(null);
        return;
      }
      const br = bubble.getBoundingClientRect();
      const spotlightBottom = rect.top + rect.height + spotlightExpandY + spotlightTranslateY;
      const anchorY = (spotlightBottom + br.top) / 2 - ATTACK_ARROW_NUDGE_UP_PX;
      setAttackGuideAnchorY(anchorY);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [step, rect, spotlightExpandY, spotlightTranslateY]);

  useEffect(() => {
    const { highlightSelector } = STEP_CONFIG[step];
    const el = document.querySelector(highlightSelector);
    if (!el || !(el instanceof HTMLElement)) {
      const t = window.setInterval(updateRect, 200);
      return () => clearInterval(t);
    }
    const ro = new ResizeObserver(() => updateRect());
    ro.observe(el);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step, updateRect]);

  const slotHighlightArrow =
    (step === 'battle_reserve' ||
      step === 'battle_equipment' ||
      step === 'battle_power' ||
      step === 'battle_skill') &&
    rect
      ? slotHighlightArrowProps(rect)
      : null;

  return (
    <div className="tutorial-overlay-root" aria-hidden={false}>
      {/* バトル内チュートリアルのみ：カード等への操作を遮断（職業選択はドラッグ必須のため除外） */}
      {step !== 'job_select' && <div className="tutorial-pointer-blocker" aria-hidden />}
      {rect ? (
        <div
          className="tutorial-spotlight"
          style={{
            top: rect.top - spotlightExpandY,
            left: rect.left,
            width: rect.width,
            height: rect.height + 2 * spotlightExpandY,
            transform: spotlightTranslateY !== 0 ? `translateY(${spotlightTranslateY}px)` : undefined,
          }}
        />
      ) : (
        <div className="tutorial-overlay-backdrop" />
      )}
      <div
        className={`tutorial-top-panel${step === 'job_select' ? ' tutorial-top-panel--arrow-first' : ''}${
          step === 'battle_hand' ||
          step === 'battle_reserve' ||
          step === 'battle_equipment' ||
          step === 'battle_power' ||
          step === 'battle_attack' ||
          step === 'battle_skill'
            ? ' tutorial-top-panel--center'
            : ''
        }${step === 'battle_attack' ? ' tutorial-top-panel--attack' : ''}`}
      >
        <div className="tutorial-text-bubble">
          {step === 'job_select' ? (
            <>
              <div className="tutorial-arrow tutorial-arrow--up" aria-hidden>
                ↑
              </div>
              <p className="tutorial-message">{message}</p>
            </>
          ) : step === 'battle_reserve' ||
            step === 'battle_equipment' ||
            step === 'battle_power' ||
            step === 'battle_attack' ||
            step === 'battle_skill' ? (
            <p className="tutorial-message">{message}</p>
          ) : (
            <>
              <p className="tutorial-message">{message}</p>
              <div className="tutorial-arrow" aria-hidden>
                ↓
              </div>
            </>
          )}
        </div>
      </div>
      {slotHighlightArrow ? (
        <div className="tutorial-arrow-reserve" style={slotHighlightArrow.style} aria-hidden>
          <span className="tutorial-arrow-reserve__bob">{slotHighlightArrow.glyph}</span>
        </div>
      ) : null}
      {attackGuideAnchorY !== null ? (
        <div
          className="tutorial-attack-guide"
          style={{
            left: '50%',
            top: attackGuideAnchorY,
            width: ATTACK_GUIDE_SVG_WIDTH,
            height: ATTACK_GUIDE_SVG_HEIGHT,
          }}
          aria-hidden
        >
          <svg
            className="tutorial-attack-guide__svg"
            width={ATTACK_GUIDE_SVG_WIDTH}
            height={ATTACK_GUIDE_SVG_HEIGHT}
            viewBox={`0 0 ${ATTACK_GUIDE_SVG_WIDTH} ${ATTACK_GUIDE_SVG_HEIGHT}`}
            aria-hidden
          >
            <path
              d="M 11 5 L 5 14 L 17 14 Z M 11 14 L 11 40"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : null}
      <div className="tutorial-actions">
        <button type="button" className="tutorial-btn tutorial-btn--skip" onClick={onSkip}>
          スキップ
        </button>
        <button type="button" className="tutorial-btn tutorial-btn--next" onClick={onNext}>
          次へ
        </button>
      </div>
    </div>
  );
};
