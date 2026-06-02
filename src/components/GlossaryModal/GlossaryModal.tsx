import { useMemo, useState } from 'react';
import './GlossaryModal.css';
import { ICONS } from '../../assets/icons';
import type { JobId } from '../../types/game';
import { isJobUnlocked } from '../../utils/jobUnlockSystem';

type GlossaryEntry =
  | { type: 'heading'; term: string }
  | { type: 'item'; term: string; desc: string; jobId?: JobId; getDesc?: () => string };

const BADGE_ICONS: Record<string, string> = {
  '脆弱（アイコン表示）': ICONS.badgeVulnerable,
  '弱体（アイコン表示）': ICONS.badgeWeak,
  '炎上（アイコン表示）': ICONS.badgeBurn,
  '攻撃デバフ（アイコン表示）': ICONS.badgeAttackDown,
  '強化（敵のバフ表示）': ICONS.badgeStrength,
};

const canRevealGlossaryJob = (jobId?: JobId): boolean =>
  !jobId || jobId === 'carpenter' || isJobUnlocked(jobId);

const getMentalDescription = (): string => {
  const visibleLimits = ['大工7/上限9'];
  if (isJobUnlocked('cook')) visibleLimits.push('料理人6/上限8');
  if (isJobUnlocked('unemployed')) visibleLimits.push('無職10/上限10');
  if (isJobUnlocked('courier')) visibleLimits.push('配達員7/上限24');

  const lowMentalNote = isJobUnlocked('unemployed')
    ? '0になるとハングリー系の追加効果や、ドロー時の「不安」混入などに注意。'
    : '0になると一部効果や、ドロー時の「不安」混入などに注意。';

  return `タイムバーの長さに効くステータス。職業ごとに初期値・上限が異なる（例：${visibleLimits.join(
    '、',
  )}）。戦闘に勝つと+1回復し、職業上限まで成長する。敵のメンタル攻撃や一部イベントで減る。${lowMentalNote}`;
};

const GLOSSARY_ITEMS: GlossaryEntry[] = [
  { type: 'heading', term: '基本システム' },
  {
    type: 'item',
    term: 'タイムバー',
    desc: 'そのターンに使える行動時間（秒）。基本は「5秒＋メンタル×0.3秒」に、ターンごとのボーナス秒が加算される（小数第1位まで）。最低3秒、メンタルが高いほど長くなる。メンタル上限は職業ごとに異なる。カードをタイムラインに置くと、カードのコスト分だけ時間が減る。5秒以上残して次のターンに進むと、次のターンに0.5秒が加算される。温存するたびに0.5秒消費する。',
  },
  {
    type: 'item',
    term: 'メンタル',
    desc: 'タイムバーの長さに効くステータス。職業ごとに初期値・上限が異なる（例：大工7/上限9、料理人6/上限8、無職10/上限10、配達員7/上限24）。戦闘に勝つと+1回復し、職業上限まで成長する。敵のメンタル攻撃や一部イベントで減る。0になるとハングリー系の追加効果や、ドロー時の「不安」混入などに注意。',
    getDesc: getMentalDescription,
  },
  {
    type: 'item',
    term: 'ブロック',
    desc: 'ダメージを先に吸収するシールド。敵からの攻撃ではブロックを先に削り、残りがHPに入る。プレイヤーのブロックはターン終了で0に戻る（一部カードで持続する場合あり）。敵にもブロックがあり、こちらの攻撃に同様に効く。',
  },
  {
    type: 'item',
    term: 'ゴールド',
    desc: 'マップの質屋でカード・アイテム・お守りを買うのに使う。戦闘勝利やイベントで増える。一部の敵行動で奪われることがある。',
  },

  { type: 'heading', term: 'カードの種類' },
  {
    type: 'item',
    term: 'アタック',
    desc: '敵にダメージを与えるカード。敵キャラへドラッグして対象にする。全体攻撃・多段攻撃など、カードごとに挙動が異なる。',
  },
  {
    type: 'item',
    term: 'スキル',
    desc: 'ブロック・ドロー・デバフ付与・バフなど、攻撃以外の効果が中心のカード。基本的にタイムバー（タイムライン）へドラッグして使用する。',
  },
  {
    type: 'item',
    term: 'パワー',
    desc: 'タイムラインで使用するとパワースロットに置かれ、戦闘中ずっと効果が発動する。一度使うと手札・山札には戻らず、戦闘終了までパワーとして有効。',
  },
  {
    type: 'item',
    term: '装備',
    desc: 'ツールスロットに装備され、毎ターン開始時などに自動で効果が発動するカード。枠は最大3つ。',
  },
  {
    type: 'item',
    term: '不安',
    desc: '使用できない邪魔カード。タイムラインに置くと時間を消費するだけ。メンタルが最低のとき、カードをドローするたびに独立して10%の確率で手札に混ざる。捨て札から山に戻るシャッフルでは不安は消える。戦闘終了後はデッキから除かれる。',
  },
  {
    type: 'item',
    term: '呪い',
    desc: '使用不可で手札を圧迫するカード。特定の敵行動などで捨て札に加わる。戦闘終了後はデッキから除かれる。',
  },

  { type: 'heading', term: 'カードに付くバッジ' },
  {
    type: 'item',
    term: '【温存】',
    desc: 'このマークがあるカードだけ、温存したときに「温存ボーナス」が定義されている（ダメージ倍率・ブロック倍率・追加効果など）。温存スロットに置いたターンの次のターンに使うとボーナスが乗る。カードごとに内容は異なる。',
  },
  {
    type: 'item',
    term: '【準備】',
    desc: '段取りの起点になるマーク。このカードをタイムラインで直前に使い、その次に置いたカードに段取りボーナス（ダメージ・ブロック・回復などが倍率アップ）が付く。倍率の基礎は1.2倍（宮大工の状態などで1.5倍・1.8倍に上がる場合あり）。',
  },
  {
    type: 'item',
    term: '【消耗】',
    desc: '使用後に戦闘中の「除外」へ送られるマーク。通常は1回使用で除外される。一部の回復・ゴールド獲得・スタミナ回復カードは同じ【消耗】表示でも戦闘中2回まで使用でき、2回目の使用後に除外される。戦闘終了後はデッキへ戻る。',
  },
  {
    type: 'item',
    term: '【消滅】',
    desc: '使用後に戦闘中の「除外」へ送られ、戦闘終了後もデッキへ戻らないマーク。そのラン中のデッキから消える。',
  },
  {
    type: 'item',
    term: '【制限】',
    desc: '同じラン中のデッキに複数枚入れない特別カードに付くマーク。ランキング報酬など、強力な1枚限定カードで使用する。',
  },
  {
    type: 'item',
    term: '【追込】',
    desc: 'HP条件を満たした状態でプレイすると、ボーナスダメージが発動し、さらに使用後にデッキに戻らず「除外」される。条件を満たさなければ通常どおり捨て札へ戻る。起死回生などに付いている。',
  },
  {
    type: 'item',
    term: '【自傷】',
    desc: 'HPを支払う効果を持つマーク。効果で指定されたダメージを自分に与えたうえでカードを使用する。通常はコストを払った後にHPが1以上残る必要があり、払えないときは使えない。無職は専用仕様として自傷ではHP0にならず、HP1では自傷ダメージを受けずに使用できる。',
    jobId: 'unemployed',
  },
  {
    type: 'item',
    term: '【不動】',
    desc: '配達員専用。過労ダウン中にしか使用できないカードに付くマーク。通常時は使えないが、過労ダウン中は固定3.5秒で使用できる。',
    jobId: 'courier',
  },
  {
    type: 'item',
    term: '【不屈】',
    desc: '配達員専用。通常時も使用でき、過労ダウン中でも使用できるカードに付くマーク。過労ダウン中は固定3.5秒で使用できる。',
    jobId: 'courier',
  },
  {
    type: 'item',
    term: '【スタミナ】',
    desc: '配達員専用。スタミナを回復・消費・参照するカードに付くマーク。スタミナ回復カードは1ターンに2枚まで使用でき、基本的に【消耗】として戦闘中2回使用後に除外される。',
    jobId: 'courier',
  },
  {
    type: 'item',
    term: '【食材】',
    desc: '使用すると満腹ゲージが+1される（1ターンに1回まで）。満腹ゲージ5到達で、1回目はHP5回復、2回目はブロック10、3回目以降は3ダメージ。',
    jobId: 'cook',
  },
  {
    type: 'item',
    term: '【調理】',
    desc: '使用すると調理ゲージが増加する。調理ゲージはフランベ等の攻撃カードで消費してダメージに変換。',
    jobId: 'cook',
  },

  { type: 'heading', term: '温存・段取り' },
  {
    type: 'item',
    term: '温存（行動）',
    desc: 'カードを敵やタイムバーではなく「温存エリア」にドロップし、次の自分のターンの開始時に手札へ戻す行動。温存するたびに0.5秒消費する。加えて温存した枚数×1.5秒、次ターンのタイムバー最大時間が減る（例：1枚で−1.5秒、2枚で−3秒）。温存枠は最大2枚。',
  },
  {
    type: 'item',
    term: '温存ボーナス',
    desc: '【温存】付きカードを温存したときだけ、次のターンに使った際の追加効果。カード定義ごとに違い、一度発動すると通常の数値に戻る。',
  },
  {
    type: 'item',
    term: '温存効果の上限',
    desc: '【温存】バッジ付きカードは、手札に2回入ると温存ボーナスが失効する。温存したターンを含めてカウントされる。',
  },
  {
    type: 'item',
    term: '段取り',
    desc: '【準備】カードの直後に出したカードにかかるボーナスの総称。ダメージ・ブロック・回復量などに倍率が掛かる。コストが変化するカードもある。',
  },

  { type: 'heading', term: '職業固有メカニクス' },
  {
    type: 'item',
    term: '足場（大工）',
    desc: '大工のリソース。足場ボーナス付きアタックは「足場の量×カードの倍率」がダメージに加算される。足場をまとめて消費するカードもある。戦闘終了でリセット。',
  },
  {
    type: 'item',
    term: '調理ゲージ（料理人）',
    desc: '料理人のリソース。【食材】系で上がり、【調理】アタックは「ゲージ×倍率」が加算される。一括消費カードでゲージを使い切るものもある。戦闘終了でリセット。',
    jobId: 'cook',
  },
  {
    type: 'item',
    term: 'スタミナ（配達員）',
    desc: '配達員のリソース。最大10で、自分のターン開始時に1減る。スタミナが減るほど全カードのコストが+0.5秒ずつ重くなる。スタミナ回復カードは1ターンに2枚まで。',
    jobId: 'courier',
  },
  {
    type: 'item',
    term: '過労ダウン（配達員）',
    desc: '配達員のスタミナが0になると発生する状態。4ターンの間、アタックと通常スキルは使えない。ブロックカード・【不屈】・【不動】カードは固定3.5秒で使用できる。復帰時はスタミナ6から再開する。',
    jobId: 'courier',
  },
  {
    type: 'item',
    term: 'ハングリー精神（無職）',
    desc: 'HPが減ると攻撃が強くなる仕組み。HP50%以下でダメージ+3（ハングリー）、30%以下でさらに強化（覚醒）など、状態に応じてボーナスやコスト減が変わる。',
    jobId: 'unemployed',
  },

  { type: 'heading', term: '戦闘画面のステータスバッジ' },
  {
    type: 'item',
    term: '脆弱（アイコン表示）',
    desc: '紫色の盾にひびのバッジ。付いている側は「受けるダメージが増える」状態。数字は残りターン。敵・プレイヤーどちらにも付く。敵が脆弱のとき、こちらの攻撃は1.5倍相当の表示になる。',
  },
  {
    type: 'item',
    term: '弱体（アイコン表示）',
    desc: '赤色の下向き矢印のバッジ。付いている側は「与えるダメージが25％減少」する状態。数字は残りターン。プレイヤー・敵どちらにも付く。',
  },
  {
    type: 'item',
    term: '炎上（アイコン表示）',
    desc: '炎マークのバッジ。ターン終了時に表示の数字分のダメージなど、炎上固有の処理がある。説明は対象（プレイヤーか敵か）で文言が異なることがある。',
  },
  {
    type: 'item',
    term: '攻撃デバフ（アイコン表示）',
    desc: '敵だけに付くことが多い、剣に下向き矢印のバッジ。敵の攻撃力を下げる「攻撃力ダウン」。数字は残りターンとして表示され、カードごとに継続ターンが異なる。',
  },
  {
    type: 'item',
    term: '強化（敵のバフ表示）',
    desc: '敵のステータスに出る「強化+N」のような表示。敵の攻撃力などが上がっている状態。ターン経過で減っていく。',
  },

  { type: 'heading', term: '状態異常（ルール詳細）' },
  {
    type: 'item',
    term: '脆弱',
    desc: '受けるダメージが増える。計算上は1.5倍に近い扱い（最終は整数に切り捨て）。残りターンが1ずつ減り0で消える。プレイヤー・敵の両方に付与されうる。',
  },
  {
    type: 'item',
    term: '弱体',
    desc: '与えるダメージが25％減少（計算はダメージに0.75倍を掛けて切り捨て）。残りターンが減り、0で消える。プレイヤー・敵の両方に付与されうる。',
  },
  {
    type: 'item',
    term: '炎上・火傷',
    desc: 'ターン終了時（敵側）／次の自分ターン開始時（プレイヤー側）に、残りターン数と同じダメージを受ける。ダメージ後に残りターンが1減り、0で消える。重ねるとターン数が加算され、次のダメージが大きくなる。',
  },
  {
    type: 'item',
    term: '毒',
    desc: 'ターン終了時（敵）／次の自分ターン開始時（プレイヤー）に、現在HPの5%（切り上げ）のダメージを受ける。残りターンが1減り、0で消える。重ねるとターン数が加算される。',
  },
  {
    type: 'item',
    term: '攻撃力ダウン',
    desc: '主に敵に付く。敵の物理攻撃の基礎値を減らす。土下座などのカードで付与でき、カードごとに指定されたターン数だけ継続する。数字は残りターン。',
  },

  { type: 'heading', term: 'マップ' },
  {
    type: 'item',
    term: '⚔️ 戦闘',
    desc: '通常の敵との戦闘。勝利でゴールドやカード報酬。',
  },
  {
    type: 'item',
    term: '敵数の出現確率',
    desc: '通常戦の敵数は全職業共通で、1体60%・2体35%・3体5%。強敵とエリアボスは常に1体。',
  },
  {
    type: 'item',
    term: '💀 強敵',
    desc: 'エリート級。報酬が良いが敵が強い。お守りが手に入ることもある。',
  },
  {
    type: 'item',
    term: '👑 エリアボス',
    desc: 'エリアのボス戦。倒すと次エリアへ。HP帯などで行動が変わることがある。',
  },
  {
    type: 'item',
    term: '🏪 質屋',
    desc: 'カード・アイテム・お守りの購入。デッキのカード売却や、ゴールドでカード削除などもできる（回数制限あり）。',
  },
  {
    type: 'item',
    term: '⛩️ 神社',
    desc: 'お守りを3択から1つ入手。既に持っているものは選べない。',
  },
  {
    type: 'item',
    term: '🏨 ホテル',
    desc: '休息。HP回復・カード強化・メンタル回復・アイテムなどから選べる。',
  },
  {
    type: 'item',
    term: '❓ イベント',
    desc: 'ランダムイベント。選択肢でHP・ゴールド・メンタル・カードなどが変わる。',
  },

  { type: 'heading', term: 'その他' },
  {
    type: 'item',
    term: 'お守り',
    desc: '常時効果を持つアイテム。神社・強敵・イベントなどで入手。同じお守りは重複入手できない。',
  },
  {
    type: 'item',
    term: 'アイテム（バトル）',
    desc: '戦闘中に使い切りで使える消費アイテム。最大3個まで所持。回復・ドロー・時間増加など。',
  },
  {
    type: 'item',
    term: '除外',
    desc: 'デッキや捨て札の循環に戻らない状態。【消耗】や【消滅】を使ったカードなどが該当。戦闘中は一覧で確認できる。',
  },
  {
    type: 'item',
    term: 'レアリティ',
    desc: 'カードの希少度の目安。コモン（灰）・アンコモン（青）・レア（金）・レジェンド。通常カード報酬の各候補1枚ごとの出現率は、コモン77%・アンコモン20%・レア2%・レジェンド1%。レジェンドは優勝者報酬カード。強敵/ボス報酬やショップは別抽選。',
  },
  {
    type: 'item',
    term: '通常カード報酬のレジェンド確率',
    desc: '通常カード報酬は3択で表示されるため、1回の報酬画面に少なくとも1枚レジェンドが出る確率は約2.97%。',
  },
];


const normalizeGlossaryQuery = (value: string): string => value.trim().toLowerCase();

const getVisibleGlossaryItems = (): GlossaryEntry[] => {
  const visibleItems: GlossaryEntry[] = [];
  for (const item of GLOSSARY_ITEMS) {
    if (item.type === 'heading') {
      visibleItems.push(item);
      continue;
    }
    if (!canRevealGlossaryJob(item.jobId)) continue;
    visibleItems.push({ ...item, desc: item.getDesc ? item.getDesc() : item.desc });
  }
  return visibleItems;
};

const itemMatchesQuery = (item: GlossaryEntry, query: string): boolean => {
  if (query === '') return true;
  if (item.type === 'heading') return item.term.toLowerCase().includes(query);
  return `${item.term} ${item.desc}`.toLowerCase().includes(query);
};

const filterGlossaryItems = (items: GlossaryEntry[], query: string): GlossaryEntry[] => {
  if (query === '') return items;

  const filtered: GlossaryEntry[] = [];
  let currentHeading: GlossaryEntry | null = null;
  let currentItems: GlossaryEntry[] = [];

  const flushSection = () => {
    if (!currentHeading) return;
    const headingMatches = itemMatchesQuery(currentHeading, query);
    const matchedItems = currentItems.filter((item) => itemMatchesQuery(item, query));
    if (headingMatches || matchedItems.length > 0) {
      filtered.push(currentHeading, ...(headingMatches ? currentItems : matchedItems));
    }
  };

  for (const item of items) {
    if (item.type === 'heading') {
      flushSection();
      currentHeading = item;
      currentItems = [];
    } else {
      currentItems.push(item);
    }
  }
  flushSection();

  return filtered;
};

interface Props {
  onClose: () => void;
}

export const GlossaryModal = ({ onClose }: Props) => {
  const [searchText, setSearchText] = useState('');
  const searchQuery = normalizeGlossaryQuery(searchText);
  const filteredItems = useMemo(() => filterGlossaryItems(getVisibleGlossaryItems(), searchQuery), [searchQuery]);

  return (
  <div className="glossary-overlay" onClick={onClose}>
    <div className="glossary-modal" onClick={(e) => e.stopPropagation()}>
      <div className="glossary-header">
        <h3 className="glossary-title">📖 用語集</h3>
        <button type="button" className="btn-glossary-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="glossary-search">
        <input
          className="glossary-search-input"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="用語・効果・バッジを検索"
          aria-label="用語集を検索"
        />
      </div>
      <div className="glossary-list">
        {filteredItems.map((item, idx) => {
          if (item.type === 'heading') {
            return (
              <div key={`heading-${idx}`} className="glossary-heading">
                {item.term}
              </div>
            );
          }
          return (
            <div key={`${item.term}-${idx}`} className="glossary-item">
              <p className="glossary-term">
                {BADGE_ICONS[item.term] && (
                  <img
                    src={BADGE_ICONS[item.term]}
                    alt=""
                    style={{ height: '18px', width: '18px', verticalAlign: 'middle', marginRight: '4px' }}
                  />
                )}
                {item.term}
              </p>
              <p className="glossary-desc">{item.desc}</p>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="glossary-empty">
            <p className="glossary-empty-title">該当する用語がありません</p>
            <p className="glossary-empty-desc">別のキーワードで検索してください。</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
