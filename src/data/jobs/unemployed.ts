import type { Card } from '../../types/game';

export const UNEMPLOYED_STARTER_DECK: Card[] = [
  { id: 'punch_1', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5 },
  { id: 'punch_2', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5 },
  { id: 'punch_3', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5 },
  { id: 'punch_4', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5 },
  { id: 'cardboard_1', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5 },
  { id: 'cardboard_2', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5 },
  { id: 'cardboard_3', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5 },
  { id: 'dogeza', name: '土下座', type: 'skill', timeCost: 1, description: '敵1体の攻撃力-3（2ターン）', icon: '🙇', sellValue: 5, effects: [{ type: 'debuff_enemy_atk', value: 3, duration: 2 }] },
  { id: 'kiai', name: '気合い', type: 'skill', timeCost: 1, description: '自分にダメージ5、タイムバー+2秒', icon: '💢', sellValue: 5, effects: [{ type: 'self_damage', value: 5 }, { type: 'time_boost', value: 2 }] },
  { id: 'yakekuso', name: 'ヤケクソパンチ', type: 'attack', timeCost: 2, description: '減っているHP分のダメージ。覚醒中：所要時間1秒', damage: 0, icon: '💥', sellValue: 5, tags: ['missing_hp_damage'] },
];

export const UNEMPLOYED_COMMON_POOL: Card[] = [
  { id: 'can', name: '空き缶投げ', type: 'attack', timeCost: 1, description: '3ダメージ', damage: 3, icon: '🥫', sellValue: 5 },
  { id: 'newspaper', name: '新聞紙アーマー', type: 'skill', timeCost: 1, description: '3ブロック、カード1枚ドロー', block: 3, icon: '📰', sellValue: 5, effects: [{ type: 'draw', value: 1 }] },
  { id: 'umbrella', name: '傘で突く', type: 'attack', timeCost: 2, description: '7ダメージ、2ブロック', damage: 7, block: 2, icon: '☂️', sellValue: 5 },
  { id: 'hello_work', name: 'ハローワークへ行く', type: 'skill', timeCost: 2, description: 'カード3枚ドロー、次ターンタイムバー-2秒', icon: '🏢', sellValue: 5, effects: [{ type: 'draw', value: 3 }, { type: 'next_turn_time_penalty', value: 2 }] },
  { id: 'vending_kick', name: '自販機キック', type: 'attack', timeCost: 1, description: '4ダメージ、50%で+10G', damage: 4, icon: '🥾', sellValue: 5 },
];

export const UNEMPLOYED_UNCOMMON_POOL: Card[] = [
  { id: 'welfare', name: '生活保護申請', type: 'skill', timeCost: 3, description: 'HP8回復', icon: '📄', sellValue: 12, effects: [{ type: 'heal', value: 8 }] },
  { id: 'cardboard_house', name: '段ボールハウス', type: 'tool', timeCost: 2, description: '毎ターン3ブロック。覚醒中は8ブロック', block: 3, icon: '🏠', sellValue: 12, tags: ['awakened_boost'] },
  { id: 'interview', name: '面接練習', type: 'skill', timeCost: 2, description: '次に使うカードを2回発動', icon: '👔', sellValue: 12, effects: [{ type: 'double_next', value: 1 }] },
  { id: 'lighter', name: '100円ライター', type: 'tool', timeCost: 1, description: 'アタック使用時20%で火傷2付与', icon: '🔥', sellValue: 12 },
  { id: 'konjou', name: '根性', type: 'skill', timeCost: 1, description: '自分にダメージ10、次2回のアタック+5', icon: '😤', sellValue: 12, effects: [{ type: 'self_damage', value: 10 }, { type: 'attack_buff', value: 5 }] },
  { id: 'kajiba', name: '火事場の馬鹿力', type: 'attack', timeCost: 3, description: '減っているHP×0.5ダメージ。覚醒中：×0.8', damage: 0, icon: '💪', tags: ['missing_hp_damage_scaled'], sellValue: 12 },
];

export const UNEMPLOYED_RARE_POOL: Card[] = [
  { id: 'gamble', name: '一発逆転ギャンブル', type: 'skill', timeCost: 1, description: '50%で敵に25ダメージ、50%で自分に10ダメージ', icon: '🎰', sellValue: 25 },
  { id: 'revival', name: '七転び八起き', type: 'power', timeCost: 4, description: '戦闘不能時HP1で1回復活', icon: '🔄', sellValue: 25 },
  { id: 'death_wish', name: 'デスウィッシュ', type: 'power', timeCost: 3, description: 'HP回復を全て無効化。毎ターン全カード+4ダメージ', icon: '💀', sellValue: 25 },
  { id: 'cliff_edge', name: '崖っぷちの底力', type: 'power', timeCost: 5, description: '覚醒中：毎ターンカード2枚追加ドロー＋タイムバー+1秒', icon: '⚡', sellValue: 25 },
  { id: 'revenge', name: 'リベンジ', type: 'attack', timeCost: 2, description: '前ターンに受けたダメージ分の攻撃。覚醒中：1.5倍', damage: 0, icon: '🔥', tags: ['revenge_damage'], sellValue: 25 },
];
