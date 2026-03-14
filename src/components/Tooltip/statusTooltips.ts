export const STATUS_TOOLTIPS = {
  hp: {
    label: '❤️ HP',
    description: '現在の体力。0になるとゲームオーバー。',
  },
  block: {
    label: '🛡 ブロック',
    description: 'ダメージを軽減する。ターン終了時に0にリセット。',
  },
  mental: {
    label: '🧠 メンタル',
    description: 'タイムバーの長さに直結。敵の攻撃で低下し、戦闘勝利で+1回復。',
  },
  gold: {
    label: '💰 ゴールド',
    description: '質屋でカードやアイテムを購入できる。',
  },
  scaffold: {
    label: '🏗️ 足場',
    description: '足場が多いほどアタックカードのダメージが増加。戦闘終了時にリセット。',
  },
  cooking: {
    label: '🍳 調理ゲージ',
    description: '【食材】カードで上昇。【調理】カードのダメージがゲージ×倍率で増加。戦闘終了時にリセット。',
  },
  hungry: {
    label: '💢 ハングリー精神',
    description: 'HP50%以下でダメージ+3（ハングリー）、HP30%以下でダメージ+6＋時間-1秒（覚醒）。',
  },
  tool: {
    label: '🔧 道具',
    description: '装備カード。最大3枠。毎ターン自動で効果が発動する。',
  },
} as const;

export const ENEMY_ACTION_TOOLTIPS = {
  attack: {
    label: '⚔️ 攻撃',
    description: 'プレイヤーにダメージを与える。ブロックで軽減できる。',
  },
  mental_attack: {
    label: '🧠 メンタル攻撃',
    description: 'プレイヤーのメンタルを低下させる。メンタルが下がるとタイムバーが短くなる。',
  },
  defend: {
    label: '🛡 防御',
    description: '敵がブロックを張る。ブロック分のダメージを軽減する。',
  },
  buff: {
    label: '⬆️ 強化',
    description: '敵自身を強化する。攻撃力が上昇する。',
  },
  debuff: {
    label: '💀 呪い付与',
    description: 'プレイヤーのデッキに呪いカードを混入させる。使用不可で邪魔になる。',
  },
  idle: {
    label: '💤 休み',
    description: '何もしないターン。',
  },
} as const;

export type TooltipKey = keyof typeof STATUS_TOOLTIPS | keyof typeof ENEMY_ACTION_TOOLTIPS;
