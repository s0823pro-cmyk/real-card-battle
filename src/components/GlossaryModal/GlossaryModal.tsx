import './GlossaryModal.css';

type GlossaryEntry =
  | { type: 'heading'; term: string }
  | { type: 'item'; term: string; desc: string };

const GLOSSARY_ITEMS: GlossaryEntry[] = [
  { type: 'heading', term: '基本システム' },
  {
    type: 'item',
    term: 'タイムバー',
    desc: '毎ターン使える行動時間。メンタル1につき+0.3秒、基本5秒。最大10（8秒）、最低3秒が保証される。カードを使うごとにカードのコスト分消費される。',
  },
  {
    type: 'item',
    term: 'メンタル',
    desc: 'タイムバーの長さに直結するステータス。初期値は大工7・料理人6・無職10。戦闘に勝つと+1回復（最大10）。敵のメンタル攻撃で減少する。',
  },
  {
    type: 'item',
    term: 'ブロック',
    desc: '敵の攻撃を軽減するバリア。攻撃を受けると先にブロックが削られ、残った分がHPに入る。ターン終了時にリセット（鉄筋コンクリートで持続可能）。',
  },

  { type: 'heading', term: 'カードの種類' },
  {
    type: 'item',
    term: 'アタック',
    desc: '敵にダメージを与えるカード。敵キャラにドラッグして使用する。',
  },
  {
    type: 'item',
    term: 'スキル',
    desc: 'ブロック獲得・ドロー・デバフ付与など様々な効果を持つカード。タイムバーにドラッグして使用する。',
  },
  {
    type: 'item',
    term: 'パワー',
    desc: '使用するとパワースロットに置かれ、戦闘中ずっと効果が持続するカード。使用後はデッキに戻らない。',
  },
  {
    type: 'item',
    term: '道具',
    desc: '使用するとツールスロットに装備され、毎ターン開始時に自動で効果が発動するカード。使用後はデッキに戻らない。',
  },
  {
    type: 'item',
    term: '不安',
    desc: '使用不可のカード。タイムライン上に置くと1秒を無駄に消費する。メンタルが3以下のとき毎ターン1枚、メンタルが0のとき毎ターン2枚ドローに混入する。戦闘終了後はデッキから除去される。',
  },
  {
    type: 'item',
    term: '呪い',
    desc: '使用不可のカード。手札を圧迫するだけで何もできない。特定の敵の行動で捨て札に追加される。戦闘終了後はデッキから除去される。',
  },

  { type: 'heading', term: '温存・段取り' },
  {
    type: 'item',
    term: '温存',
    desc: 'カードを次のターンに持ち越す行動。最大2枚まで温存でき、次ターンのタイムバーが-1.5秒される（2枚なら-3秒）。温存ボーナスを持つカードは次ターンに使うと効果が強化される。',
  },
  {
    type: 'item',
    term: '温存ボーナス',
    desc: '温存したターンの次のターンに発動する追加効果。カードごとに異なる（例: 乾燥させた木材はダメージ2倍、補強壁はブロック2倍）。一度発動すると元の値に戻る。',
  },
  {
    type: 'item',
    term: '段取り',
    desc: '【準備】バッジを持つカードの直後に使ったカードに発動するボーナス。ダメージ・ブロック・回復が1.3倍になる。一部カードは段取り時に特別なコストが設定されている。宮大工の技で倍率を1.5倍/1.8倍に強化可能。',
  },
  {
    type: 'item',
    term: '準備バッジ',
    desc: '段取りボーナスを発動できるカードのバッジ。足場を組む・設計図を描く・木材ブロックなどが該当する。',
  },
  {
    type: 'item',
    term: '消耗バッジ',
    desc: 'このバッジを持つカードを温存すると、次ターンに使用後デッキに戻らず除外される。',
  },

  { type: 'heading', term: '職業固有メカニクス' },
  {
    type: 'item',
    term: '足場（大工）',
    desc: '大工固有のゲージ。足場ボーナスを持つカードのダメージに「足場 × 倍率」が加算される（釘打ちは×2）。足場消費カードは足場 × 倍率のダメージを与えて足場を0にする。戦闘終了時にリセット。',
  },
  {
    type: 'item',
    term: '調理ゲージ（料理人）',
    desc: '料理人固有のゲージ。【食材】カードを使うたびに増加する。【調理】カードのダメージに「ゲージ × 倍率」が加算される。調理消費カードは使用後ゲージを0にする。戦闘終了時にリセット。',
  },
  {
    type: 'item',
    term: 'ハングリー精神（無職）',
    desc: '無職固有のメカニクス。HP50%以下で「ハングリー」状態になりダメージ+3。HP30%以下で「覚醒」状態になりダメージ+6かつカードのコスト-1秒。覚醒中は崖っぷちの底力などのカードが強化される。',
  },

  { type: 'heading', term: '状態異常' },
  {
    type: 'item',
    term: '脆弱',
    desc: '受けるダメージが1.5倍になるデバフ。ターン経過で1ずつ減少し、0になると消える。プレイヤーにも敵にも付与できる。',
  },
  {
    type: 'item',
    term: '弱体',
    desc: '与えるダメージが0.75倍になるデバフ。ターン経過で1ずつ減少し、0になると消える。プレイヤーにも敵にも付与できる。',
  },
  {
    type: 'item',
    term: '火傷',
    desc: '毎ターン終了時にそのスタック値分のダメージを受けるデバフ。ダメージを与えた後に消去される（1ターン限り）。',
  },
  {
    type: 'item',
    term: '攻撃力ダウン',
    desc: '敵の攻撃力を減少させるデバフ。土下座などで付与できる。ターン経過で消える。',
  },

  { type: 'heading', term: 'マップ' },
  {
    type: 'item',
    term: '⚔️ 戦闘',
    desc: '通常の敵との戦闘マス。勝利するとゴールドとカード報酬を獲得できる。',
  },
  {
    type: 'item',
    term: '💀 強敵',
    desc: 'エリートクラスの強敵との戦闘マス。通常より難しいが、勝利するとお守り報酬も獲得できる。',
  },
  {
    type: 'item',
    term: '👑 エリアボス',
    desc: 'エリアの最後に控えるボス。倒すと次のエリアへ進める。フェーズ制でHPによって行動パターンが変化する。',
  },
  {
    type: 'item',
    term: '🏪 質屋',
    desc: 'カードやアイテム・お守りを購入できるマス。デッキのカードを売却（1回/訪問）またはゴールドを払って削除することもできる。',
  },
  {
    type: 'item',
    term: '⛩️ 神社',
    desc: 'お守りを1つ選んで入手できるマス。3択から選ぶ（所持済みのものは出現しない）。',
  },
  {
    type: 'item',
    term: '🏨 ホテル',
    desc: '休息マス。HP30%回復・カード1枚強化・メンタル+2・アイテム入手の4択から1つ選べる。',
  },
  {
    type: 'item',
    term: '❓ イベント',
    desc: 'ランダムなイベントが発生するマス。選択肢によってHP・ゴールド・メンタル・カードなどが変動する。',
  },

  { type: 'heading', term: 'その他' },
  {
    type: 'item',
    term: 'お守り',
    desc: 'パッシブ効果を持つ装備品。神社・エリート戦勝利・イベントで入手できる。同じお守りは重複して入手できない。',
  },
  {
    type: 'item',
    term: 'アイテム',
    desc: '戦闘中に使い切りで使えるアイテム。最大3個まで所持できる。タイムバー延長・HP回復・攻撃バフ・ドローなどの効果がある。',
  },
  {
    type: 'item',
    term: '除外',
    desc: 'デッキにもどらないカードの状態。消耗バッジを持つカードを温存すると使用後に除外される。除外されたカードは戦闘中は閲覧できる。',
  },
  {
    type: 'item',
    term: 'レアリティ',
    desc: 'カードの入手しやすさの指標。コモン（灰）・アンコモン（青）・レア（金）の3段階。カード報酬でレアが出る確率は3%、アンコモンは20%。',
  },
];

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
        {GLOSSARY_ITEMS.map((item, idx) => {
          if (item.type === 'heading') {
            return (
              <div key={`heading-${idx}`} className="glossary-heading">
                {item.term}
              </div>
            );
          }
          return (
            <div key={item.term} className="glossary-item">
              <p className="glossary-term">{item.term}</p>
              <p className="glossary-desc">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
