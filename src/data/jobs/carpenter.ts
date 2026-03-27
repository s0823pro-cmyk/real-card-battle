import type { Card } from '../../types/game';
import { ACHIEVEMENT_LOCKED_CARD_IDS } from '../achievementDefinitions';
import { RESERVE_BONUS_CARDS, buildStarterDeck } from '../carpenterDeck';
import {
  CARPENTER_EXPANSION_COMMON,
  CARPENTER_EXPANSION_RARE,
  CARPENTER_EXPANSION_UNCOMMON,
} from './carpenterExpansion';
import electricDrillImage from '../../assets/cards/carpenter/electric_drill.png';
import woodBlockImage from '../../assets/cards/carpenter/wood_block.png';
import blueprintImage from '../../assets/cards/carpenter/blueprint.png';
import inkMarkingImage from '../../assets/cards/carpenter/ink_marking.png';
import quickNailImage from '../../assets/cards/carpenter/quick_nail.png';
import reinforcedWallImage from '../../assets/cards/carpenter/reinforced_wall.png';
import largeCraneImage from '../../assets/cards/carpenter/large_crane.png';
import concreteWallImage from '../../assets/cards/carpenter/concrete_wall.png';
import foremanImage from '../../assets/cards/carpenter/foreman.png';
import reinforcedConcreteImage from '../../assets/cards/carpenter/reinforced_concrete.png';
import safetyHelmetImage from '../../assets/cards/carpenter/safety_helmet.png';
import ironWallImage from '../../assets/cards/carpenter/iron_wall.png';
import superNailImage from '../../assets/cards/carpenter/super_nail.png';
import ridgepoleImage from '../../assets/cards/carpenter/ridgepole.png';
import templeCarpenterImage from '../../assets/cards/carpenter/temple_carpenter.png';
import renovationImage from '../../assets/cards/carpenter/renovation.png';
import masterStrikeImage from '../../assets/cards/carpenter/master_strike.png';

export const CARPENTER_COMMON_POOL: Card[] = [
  {
    id: 'power_drill',
    name: '電動ドリル',
    type: 'attack',
    timeCost: 3.5,
    damage: 12,
    description: '12ダメージ',
    icon: '🔧',
    sellValue: 6,
    imageUrl: electricDrillImage,
  },
  {
    id: 'wood_block',
    name: '木材ブロック',
    type: 'skill',
    timeCost: 2.5,
    block: 8,
    description: '8ブロック、足場+1',
    icon: '🪵',
    sellValue: 6,
    tags: ['preparation'],
    badges: ['setup'],
    effects: [{ type: 'scaffold', value: 1 }],
    imageUrl: woodBlockImage,
  },
  {
    id: 'blueprint_draw',
    name: '設計図を描く',
    type: 'skill',
    timeCost: 1,
    description: 'カード2枚ドロー',
    effects: [{ type: 'draw', value: 2 }],
    tags: ['preparation'],
    badges: ['setup'],
    icon: '📐',
    sellValue: 6,
    imageUrl: blueprintImage,
  },
  {
    id: 'sumidashi',
    name: '墨出し',
    type: 'skill',
    timeCost: 1,
    description: '次のアタックの所要時間-2秒（ターン終了で失効）',
    icon: '✏️',
    sellValue: 5,
    tags: ['preparation'],
    badges: ['setup'],
    effects: [{ type: 'next_attack_time_reduce', value: 2 }],
    imageUrl: inkMarkingImage,
  },
  {
    id: 'quick_hammer',
    name: '速打ち',
    type: 'attack',
    timeCost: 0,
    damage: 4,
    description: '4ダメージ',
    icon: '🔨',
    sellValue: 6,
    imageUrl: quickNailImage,
  },
  {
    id: 'reinforced_wall',
    name: '補強壁',
    type: 'skill',
    timeCost: 2,
    block: 6,
    description: '6ブロック',
    icon: '🧱',
    reserveBonus: {
      description: '温存時：12ブロック',
      blockMultiplier: 2,
    },
    badges: ['reserve'],
    sellValue: 8,
    imageUrl: reinforcedWallImage,
  },
  ...CARPENTER_EXPANSION_COMMON,
];

export const CARPENTER_UNCOMMON_POOL_UNFILTERED: Card[] = [
  ...RESERVE_BONUS_CARDS.filter((card) => card.id !== 'reinforced_wall'),
  {
    id: 'large_crane',
    name: '大型クレーン',
    type: 'attack',
    timeCost: 5.5,
    preparationTimeCost: 2,
    description: '全体13ダメージ。段取り時：2秒',
    damage: 13,
    icon: '🏗️',
    sellValue: 12,
    tags: ['aoe'],
    imageUrl: largeCraneImage,
  },
  {
    id: 'defense_wall',
    name: '防護壁を建てる',
    type: 'skill',
    timeCost: 4,
    description: '20ブロック、足場+2',
    block: 20,
    icon: '🧱',
    sellValue: 12,
    badges: ['setup'],
    effects: [{ type: 'scaffold', value: 2 }],
    imageUrl: concreteWallImage,
  },
  {
    id: 'foreman',
    name: '建設現場の親方',
    type: 'power',
    timeCost: 4.5,
    description: '毎ターン足場+1',
    icon: '👷',
    sellValue: 12,
    tags: ['preparation'],
    badges: ['setup'],
    effects: [{ type: 'scaffold_per_turn', value: 1 }],
    imageUrl: foremanImage,
  },
  {
    id: 'reinforced_concrete',
    name: '鉄筋コンクリート',
    type: 'skill',
    timeCost: 3,
    description: '次のターンブロックが消えない',
    icon: '🏢',
    sellValue: 12,
    effects: [{ type: 'block_persist', value: 1 }],
    imageUrl: reinforcedConcreteImage,
  },
  {
    id: 'safety_helmet',
    name: '安全ヘルメット',
    type: 'tool',
    timeCost: 3,
    description: '毎ターン+3ブロック',
    icon: '⛑️',
    sellValue: 12,
    effects: [{ type: 'block_per_turn', value: 3 }],
    imageUrl: safetyHelmetImage,
  },
  {
    id: 'iron_wall',
    name: '鉄壁工法',
    type: 'skill',
    timeCost: 2.5,
    block: 12,
    description: '12ブロック',
    icon: '🧱',
    sellValue: 14,
    imageUrl: ironWallImage,
  },
  ...CARPENTER_EXPANSION_UNCOMMON,
];

export const CARPENTER_UNCOMMON_POOL: Card[] = CARPENTER_UNCOMMON_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id),
);

/** 実績達成後にプールへ追加される大工レア */
export const CARPENTER_ACHIEVEMENT_RARE_CARDS: Card[] = [
  {
    id: 'ridgepole',
    name: '棟上げ',
    type: 'power',
    timeCost: 5,
    description: '足場5以上で毎ターン全敵に10ダメージ',
    icon: '🎌',
    rarity: 'rare',
    sellValue: 25,
    imageUrl: ridgepoleImage,
  },
  {
    id: 'temple_carpenter',
    name: '宮大工の技',
    type: 'power',
    timeCost: 6,
    description: '段取りボーナスが1.5倍に強化（通常1.2倍）',
    icon: '🏯',
    rarity: 'rare',
    sellValue: 25,
    imageUrl: templeCarpenterImage,
  },
  {
    id: 'master_strike',
    name: '匠の一撃',
    type: 'attack',
    timeCost: 4,
    preparationTimeCost: 3,
    description: '足場×5ダメージ、足場を全消費。使用後除外。段取り時：3秒',
    damage: 0,
    scaffoldMultiplier: 5,
    icon: '⚡',
    rarity: 'rare',
    sellValue: 25,
    tags: ['scaffold_consume', 'exhaust'],
    badges: ['exhaust'],
    imageUrl: masterStrikeImage,
  },
];

export const CARPENTER_RARE_POOL: Card[] = [
  {
    id: 'mega_nail',
    name: '超釘打ち',
    type: 'attack',
    timeCost: 4,
    damage: 1,
    description: '1ダメージ+足場×1.5ダメージ',
    scaffoldMultiplier: 1.5,
    tags: ['scaffold_bonus'],
    icon: '🧨',
    rarity: 'rare',
    sellValue: 14,
    imageUrl: superNailImage,
  },
  {
    id: 'renovation',
    name: 'リフォーム',
    type: 'skill',
    timeCost: 2,
    description: '手札を全て強化。使用後除外',
    icon: '🔄',
    rarity: 'rare',
    sellValue: 25,
    tags: ['exhaust'],
    badges: ['exhaust'],
    effects: [{ type: 'upgrade_all_hand_card', value: 1 }],
    imageUrl: renovationImage,
  },
  ...CARPENTER_EXPANSION_RARE,
];

/** 大工レア全件（通常プール＋実績ロック分。図鑑・実績報酬表示用） */
export const CARPENTER_RARE_POOL_ALL: Card[] = [...CARPENTER_RARE_POOL, ...CARPENTER_ACHIEVEMENT_RARE_CARDS];

export const createCarpenterStarterDeck = (): Card[] => buildStarterDeck();
