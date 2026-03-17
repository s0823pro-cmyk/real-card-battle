import './GlossaryModal.css';

const GLOSSARY_ITEMS = [
  { term: 'タイムバー', desc: '毎ターン使える時間。カードを使用するごとに消費される。' },
  { term: '温存', desc: 'カードをタイムバーに置いて次ターンに持ち越すこと。30%ボーナスがつく。' },
  { term: '段取り', desc: '前のカードが準備タグ持ちの時、次のカードに30%ボーナス。' },
  { term: '足場', desc: '大工の固有メカニクス。足場を積み上げてダメージを上げる。' },
  { term: '調理ゲージ', desc: '料理人の固有メカニクス。ゲージを溜めて大ダメージを出す。' },
  { term: 'ハングリー精神', desc: '無職の固有メカニクス。HPが減るほどダメージが上がる。' },
  { term: '脆弱', desc: '受けるダメージが1.5倍になるデバフ。ターン経過で消える。' },
  { term: '弱体', desc: '与えるダメージが0.75倍になるデバフ。ターン経過で消える。' },
  { term: '火傷', desc: '毎ターン終了時にダメージを受けるデバフ。' },
  { term: '除外', desc: 'デッキに戻らないカード。消耗バッジ持ちのカードが温存されると除外される。' },
  { term: 'お守り', desc: 'パッシブ効果を持つ装備品。神社マスで入手できる。' },
  { term: 'アイテム', desc: '使い切りの回復・強化アイテム。' },
] as const;

interface Props {
  onClose: () => void;
}

export const GlossaryModal = ({ onClose }: Props) => (
  <div className="glossary-overlay" onClick={onClose}>
    <div className="glossary-modal" onClick={(e) => e.stopPropagation()}>
      <div className="glossary-header">
        <h3 className="glossary-title">📖 用語集</h3>
        <button type="button" className="btn-glossary-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="glossary-list">
        {GLOSSARY_ITEMS.map((item) => (
          <div key={item.term} className="glossary-item">
            <p className="glossary-term">{item.term}</p>
            <p className="glossary-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
