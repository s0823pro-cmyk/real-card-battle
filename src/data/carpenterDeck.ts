import type { Card } from '../types/game';
import hammerStrikeImage from '../assets/cards/carpenter/hammer_strike.png';
import nailDriveImage from '../assets/cards/carpenter/nail_drive.png';
import sawGuardImage from '../assets/cards/carpenter/saw_guard.png';
import scaffoldBuildImage from '../assets/cards/carpenter/scaffold_build.png';
import workClothesImage from '../assets/cards/carpenter/work_clothes.png';
import driedLumberImage from '../assets/cards/carpenter/dried_lumber.png';
import sharpenedSawImage from '../assets/cards/carpenter/sharpened_saw.png';
import anxietyImage from '../assets/cards/enemy/anxiety.png';
import curseImage from '../assets/cards/enemy/curse.png';

export const CARPENTER_STARTER_DECK: Card[] = [
  { id: 'hammer_1', name: '金槌で殴る', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, sellValue: 5, icon: '🔨', imageUrl: hammerStrikeImage },
  { id: 'hammer_2', name: '金槌で殴る', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, sellValue: 5, icon: '🔨', imageUrl: hammerStrikeImage },
  { id: 'hammer_3', name: '金槌で殴る', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, sellValue: 5, icon: '🔨', imageUrl: hammerStrikeImage },
  { id: 'hammer_4', name: '金槌で殴る', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, sellValue: 5, icon: '🔨', imageUrl: hammerStrikeImage },
  { id: 'saw_guard_1', name: 'ノコギリガード', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, sellValue: 5, icon: '🪚', imageUrl: sawGuardImage },
  { id: 'saw_guard_2', name: 'ノコギリガード', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, sellValue: 5, icon: '🪚', imageUrl: sawGuardImage },
  { id: 'saw_guard_3', name: 'ノコギリガード', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, sellValue: 5, icon: '🪚', imageUrl: sawGuardImage },
  {
    id: 'build_scaffold',
    name: '足場を組む',
    type: 'skill',
    timeCost: 2,
    description: '足場+1、3ブロック',
    block: 3,
    effects: [{ type: 'scaffold', value: 1 }],
    tags: ['preparation'],
    sellValue: 5,
    icon: '🏗️',
    imageUrl: scaffoldBuildImage,
  },
  {
    id: 'nail_strike',
    name: '釘打ち',
    type: 'attack',
    timeCost: 3,
    description: '8ダメージ+足場×2',
    damage: 8,
    tags: ['scaffold_bonus'],
    sellValue: 5,
    icon: '🔩',
    imageUrl: nailDriveImage,
  },
  {
    id: 'work_clothes',
    name: '作業着を着る',
    type: 'tool',
    timeCost: 3,
    description: '毎ターン+2ブロック',
    block: 2,
    sellValue: 8,
    icon: '🦺',
    imageUrl: workClothesImage,
  },
];

export const RESERVE_BONUS_CARDS: Card[] = [
  {
    id: 'aged_wood',
    name: '乾燥させた木材',
    type: 'attack',
    timeCost: 3,
    damage: 8,
    description: '8ダメージ',
    icon: '🪵',
    reserveBonus: {
      description: '温存時：16ダメージ',
      damageMultiplier: 2,
    },
    sellValue: 8,
    imageUrl: driedLumberImage,
  },
  {
    id: 'sharpened_saw',
    name: '研いだノコギリ',
    type: 'attack',
    timeCost: 2,
    damage: 5,
    description: '5ダメージ',
    icon: '🪚',
    reserveBonus: {
      description: '温存時：10ダメージ＋足場+1',
      damageMultiplier: 2,
      extraEffects: [{ type: 'scaffold', value: 1 }],
    },
    sellValue: 8,
    imageUrl: sharpenedSawImage,
  },
  {
    id: 'reinforced_wall',
    name: '補強壁',
    type: 'skill',
    timeCost: 3,
    block: 6,
    description: '6ブロック',
    icon: '🧱',
    reserveBonus: {
      description: '温存時：12ブロック',
      blockMultiplier: 2,
    },
    sellValue: 8,
  },
];

export const ANXIETY_CARD: Card = {
  id: 'anxiety',
  name: '不安',
  type: 'status',
  timeCost: 1,
  description: '使用不可。1秒を無駄に消費する',
  icon: '😰',
  sellValue: 0,
  imageUrl: anxietyImage,
};

export const CURSE_CARD: Card = {
  id: 'curse',
  name: '呪い',
  type: 'curse',
  timeCost: 1,
  description: '使用不可。手札を圧迫する',
  icon: '💀',
  sellValue: 0,
  imageUrl: curseImage,
};

let serial = 0;

const assignId = (card: Card): Card => {
    serial += 1;
    return {
      ...card,
      id: `${card.id}_${serial}`,
    };
  };

export const buildStarterDeck = (): Card[] => {
  return CARPENTER_STARTER_DECK.map(assignId);
};

export const createCarpenterDeck = (): Card[] => buildStarterDeck();
