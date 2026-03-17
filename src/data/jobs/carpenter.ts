import type { Card } from '../../types/game';
import { RESERVE_BONUS_CARDS, buildStarterDeck } from '../carpenterDeck';
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
    timeCost: 3,
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
    timeCost: 2,
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
    description: '次のアタックの所要時間-2秒',
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
    description: '6ブロック。温存時：12ブロック',
    icon: '🧱',
    reserveBonus: {
      description: '温存時：12ブロック',
      blockMultiplier: 2,
    },
    sellValue: 8,
    imageUrl: reinforcedWallImage,
  },
];

export const CARPENTER_UNCOMMON_POOL: Card[] = [
  ...RESERVE_BONUS_CARDS.filter((card) => card.id !== 'reinforced_wall'),
  {
    id: 'large_crane',
    name: '大型クレーン',
    type: 'attack',
    timeCost: 5,
    preparationTimeCost: 4,
    description: '全体15ダメージ。段取り時：4秒',
    damage: 15,
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
    timeCost: 4,
    description: '毎ターン足場+1',
    icon: '👷',
    sellValue: 12,
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
    timeCost: 2,
    block: 12,
    description: '12ブロック',
    icon: '🧱',
    sellValue: 14,
    imageUrl: ironWallImage,
  },
];

export const CARPENTER_RARE_POOL: Card[] = [
  {
    id: 'mega_nail',
    name: '超釘打ち',
    type: 'attack',
    timeCost: 3,
    damage: 14,
    description: '14ダメージ+足場×2',
    scaffoldMultiplier: 2,
    tags: ['scaffold_bonus'],
    icon: '🧨',
    rarity: 'rare',
    sellValue: 14,
    imageUrl: superNailImage,
  },
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
    description: '段取りボーナスが1.5倍に強化（通常1.3倍）',
    icon: '🏯',
    rarity: 'rare',
    sellValue: 25,
    imageUrl: templeCarpenterImage,
  },
  {
    id: 'renovation',
    name: 'リフォーム',
    type: 'skill',
    timeCost: 2,
    description: '手札のカード1枚をランダムで強化。使用後除外',
    icon: '🔄',
    rarity: 'rare',
    sellValue: 25,
    tags: ['exhaust'],
    effects: [{ type: 'upgrade_random_hand_card', value: 1 }],
    imageUrl: renovationImage,
  },
  {
    id: 'master_strike',
    name: '匠の一撃',
    type: 'attack',
    timeCost: 4,
    preparationTimeCost: 3,
    description: '足場×10ダメージ、足場を全消費。段取り時：3秒',
    damage: 0,
    scaffoldMultiplier: 10,
    icon: '⚡',
    rarity: 'rare',
    sellValue: 25,
    tags: ['scaffold_consume'],
    imageUrl: masterStrikeImage,
  },
];

export const createCarpenterStarterDeck = (): Card[] => buildStarterDeck();
