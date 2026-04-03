import type { EnemyTemplateLike } from '../types/run';
import rottenFruitSellerImage from '../assets/enemies/cook/rotten_fruit_seller.png';
import blackMarketButcherImage from '../assets/enemies/cook/black_market_butcher.png';
import ripoffStallOwnerImage from '../assets/enemies/cook/ripoff_stall_owner.png';
import pestSwarmImage from '../assets/enemies/cook/pest_swarm.png';
import corruptInspectorImage from '../assets/enemies/cook/corrupt_inspector.png';
import blackMarketBossImage from '../assets/enemies/cook/black_market_boss.png';
import foodFraudBrokerImage from '../assets/enemies/cook/food_fraud_broker.png';
import merchantKingOfRotImage from '../assets/enemies/cook/merchant_king_of_rot.png';
import poisonTasterServantImage from '../assets/enemies/cook/poison_taster_servant.png';
import boilingCauldronImage from '../assets/enemies/cook/boiling_cauldron.png';
import knifeThrowingSoldierImage from '../assets/enemies/cook/knife_throwing_soldier.png';
import armoredGatekeeperImage from '../assets/enemies/cook/armored_gatekeeper.png';
import cursedRecipeBookImage from '../assets/enemies/cook/cursed_recipe_book.png';
import sousChefImage from '../assets/enemies/cook/sous_chef.png';
import rampagingPressureCookerImage from '../assets/enemies/cook/rampaging_pressure_cooker.png';
import poisonHeadChefImage from '../assets/enemies/cook/poison_head_chef.png';
import starvingWildDogImage from '../assets/enemies/cook/starving_wild_dog.png';
import witheredTreeSpiritImage from '../assets/enemies/cook/withered_tree_spirit.png';
import giantInsectImage from '../assets/enemies/cook/giant_insect.png';
import mossCoveredStatueImage from '../assets/enemies/cook/moss_covered_statue.png';
import diseasedRootImage from '../assets/enemies/cook/diseased_root.png';
import avatarOfHungerImage from '../assets/enemies/cook/avatar_of_hunger.png';
import fallenGourmetImage from '../assets/enemies/cook/fallen_gourmet.png';
import hungerKingOfWorldTreeImage from '../assets/enemies/cook/hunger_king_of_world_tree.png';

// ===== AREA 1 =====

export const COOK_AREA1_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    templateId: 'rotten_fruit_seller',
    name: '腐った果物売り',
    icon: '🍎',
    imageUrl: rottenFruitSellerImage,
    maxHp: 30,
    intents: [
      { type: 'attack', value: 8, description: '腐った果物を投げつける', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'poison', description: '腐敗の毒気', icon: '☠️' },
      { type: 'attack', value: 10, description: '腐汁を浴びせる', icon: '⚔️' },
    ],
  },
  {
    templateId: 'black_market_butcher',
    name: '闇市の肉屋',
    icon: '🔪',
    imageUrl: blackMarketButcherImage,
    maxHp: 35,
    intents: [
      { type: 'attack', value: 10, description: '肉切り包丁を振り回す', icon: '⚔️' },
      { type: 'buff', value: 3, description: '血の興奮', icon: '⬆️' },
      { type: 'attack', value: 12, description: '骨ごと叩き割る', icon: '🔪' },
    ],
  },
  {
    templateId: 'ripoff_stall_owner',
    name: 'ぼったくり屋台主',
    icon: '🏮',
    imageUrl: ripoffStallOwnerImage,
    maxHp: 28,
    intents: [
      { type: 'attack', value: 7, description: '串で突く', icon: '⚔️' },
      { type: 'steal_gold', value: 15, description: '法外な請求書を突きつける', icon: '💰' },
      { type: 'attack', value: 9, description: '熱した鍋を振り回す', icon: '⚔️' },
    ],
  },
  {
    templateId: 'pest_swarm',
    name: '害虫の群れ',
    icon: '🪲',
    imageUrl: pestSwarmImage,
    maxHp: 22,
    intents: [
      { type: 'attack', value: 3, description: '群れで噛みつく ×3', icon: '🐀' },
      { type: 'regen', value: 5, description: '繁殖する', icon: '🪲' },
    ],
  },
  {
    templateId: 'corrupt_inspector',
    name: '食品検査官（買収済み）',
    icon: '📋',
    imageUrl: corruptInspectorImage,
    maxHp: 32,
    intents: [
      { type: 'attack', value: 8, description: '不正書類で殴る', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '規制の圧力', icon: '📄' },
      { type: 'attack', value: 10, description: '摘発の脅し', icon: '⚔️' },
    ],
  },
];

export const COOK_AREA1_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'black_market_boss',
    name: '闇市の元締め',
    icon: '🕵️',
    imageUrl: blackMarketBossImage,
    maxHp: 90,
    intents: [
      { type: 'attack', value: 12, description: '縄張りを守る一撃', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '弱みを握る', icon: '💢' },
      { type: 'buff', value: 4, description: '手下を呼ぶ', icon: '📢' },
      { type: 'attack', value: 15, description: '闇の裁き', icon: '💥' },
    ],
  },
  {
    templateId: 'food_fraud_broker',
    name: '食品偽装ブローカー',
    icon: '🧾',
    imageUrl: foodFraudBrokerImage,
    maxHp: 80,
    intents: [
      { type: 'attack', value: 10, description: '偽造書類で殴る', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '巧みな詐術', icon: '📋' },
      { type: 'debuff', value: 3, debuffType: 'poison', description: '汚染食材を盛る', icon: '☠️' },
      { type: 'attack', value: 12, description: '取引の決裂', icon: '⚔️' },
    ],
  },
];

export const COOK_AREA1_BOSS: EnemyTemplateLike = {
  templateId: 'merchant_king_of_rot',
  name: '腐敗の商人王',
  icon: '👑',
  imageUrl: merchantKingOfRotImage,
  maxHp: 200,
  intents: [
    { type: 'defend', value: 15, description: '金の盾で守る', icon: '🛡️' },
    { type: 'attack', value: 14, description: '腐敗の権力を振るう', icon: '⚔️' },
    { type: 'debuff', value: 3, debuffType: 'poison', description: '毒の宴', icon: '☠️' },
    { type: 'attack', value: 16, description: '支配の鉄拳', icon: '💥' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '商人の呪縛', icon: '💢' },
  ],
};

// ===== AREA 2 =====

export const COOK_AREA2_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    templateId: 'poison_taster_servant',
    name: '毒味役の下働き',
    icon: '🥄',
    imageUrl: poisonTasterServantImage,
    maxHp: 45,
    intents: [
      { type: 'attack', value: 10, description: '毒に慣れた体当たり', icon: '⚔️' },
      { type: 'debuff', value: 3, debuffType: 'poison', description: '毒を塗りたくる', icon: '☠️' },
      { type: 'defend', value: 8, description: '毒の膜で守る', icon: '🛡️' },
    ],
  },
  {
    templateId: 'boiling_cauldron',
    name: '煮えたぎる大鍋',
    icon: '🫕',
    imageUrl: boilingCauldronImage,
    maxHp: 40,
    intents: [
      { type: 'attack', value: 12, description: '熱湯を浴びせる', icon: '⚔️' },
      { type: 'debuff', value: 3, debuffType: 'burn', description: '沸騰の熱波', icon: '🔥' },
      { type: 'attack', value: 10, description: '煮えたぎる噴出', icon: '⚔️' },
    ],
  },
  {
    templateId: 'knife_throwing_soldier',
    name: '包丁投げの料理兵',
    icon: '🗡️',
    imageUrl: knifeThrowingSoldierImage,
    maxHp: 50,
    intents: [
      { type: 'attack', value: 12, description: '包丁を投げる', icon: '⚔️' },
      { type: 'attack', value: 14, description: '連続投擲', icon: '🗡️' },
      { type: 'attack', value: 10, description: '切り込む', icon: '⚔️' },
    ],
  },
  {
    templateId: 'armored_gatekeeper',
    name: '鎧を着た門番',
    icon: '🛡️',
    imageUrl: armoredGatekeeperImage,
    maxHp: 55,
    intents: [
      { type: 'defend', value: 12, description: '鉄壁の構え', icon: '🛡️' },
      { type: 'attack', value: 14, description: '大盾の突進', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '威圧の眼光', icon: '💢' },
    ],
  },
  {
    templateId: 'cursed_recipe_book',
    name: '呪いの料理書',
    icon: '📖',
    imageUrl: cursedRecipeBookImage,
    maxHp: 38,
    intents: [
      { type: 'attack', value: 9, description: '禁断のページで打つ', icon: '⚔️' },
      { type: 'add_curse', value: 1, description: '呪いのレシピを押しつける', icon: '🌑' },
      { type: 'attack', value: 11, description: '呪文の嵐', icon: '⚔️' },
    ],
  },
];

export const COOK_AREA2_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'sous_chef',
    name: '副料理長',
    icon: '👨‍🍳',
    imageUrl: sousChefImage,
    maxHp: 110,
    intents: [
      { type: 'attack', value: 14, description: '毒入り料理を振る舞う', icon: '⚔️' },
      { type: 'debuff', value: 3, debuffType: 'poison', description: '秘密の毒素', icon: '☠️' },
      { type: 'buff', value: 4, description: '料理長の教え', icon: '⬆️' },
      { type: 'attack', value: 16, description: '必殺の一皿', icon: '💥' },
    ],
  },
  {
    templateId: 'rampaging_pressure_cooker',
    name: '暴走する圧力鍋',
    icon: '💣',
    imageUrl: rampagingPressureCookerImage,
    maxHp: 100,
    intents: [
      { type: 'defend', value: 15, description: '圧力を溜める', icon: '🛡️' },
      { type: 'defend', value: 20, description: '臨界まで圧縮', icon: '🛡️' },
      { type: 'attack', value: 35, description: '大爆発！', icon: '💥' },
    ],
  },
];

export const COOK_AREA2_BOSS: EnemyTemplateLike = {
  templateId: 'poison_head_chef',
  name: '毒の料理長',
  icon: '☠️',
  imageUrl: poisonHeadChefImage,
  maxHp: 280,
  intents: [
    { type: 'defend', value: 18, description: '毒の膜で身を守る', icon: '🛡️' },
    { type: 'attack', value: 16, description: '毒入りフルコース', icon: '⚔️' },
    { type: 'debuff', value: 4, debuffType: 'poison', description: '致死の毒素', icon: '☠️' },
    { type: 'debuff', value: 3, debuffType: 'burn', description: '灼熱の鍋', icon: '🔥' },
    { type: 'attack', value: 20, description: '毒の暴食', icon: '💥' },
  ],
};

// ===== AREA 3 =====

export const COOK_AREA3_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    templateId: 'starving_wild_dog',
    name: '飢えた野犬',
    icon: '🐕',
    imageUrl: starvingWildDogImage,
    maxHp: 50,
    intents: [
      { type: 'attack', value: 12, description: '飢えた噛みつき', icon: '⚔️' },
      { type: 'attack', value: 14, description: '狂乱の突進', icon: '🐕' },
      { type: 'mental_attack', value: 0, mentalDamage: 3, description: '断末魔の遠吠え', icon: '😤' },
    ],
  },
  {
    templateId: 'withered_tree_spirit',
    name: '枯れた果樹の精',
    icon: '🌵',
    imageUrl: witheredTreeSpiritImage,
    maxHp: 60,
    intents: [
      { type: 'attack', value: 10, description: '枯れ枝の鞭打ち', icon: '⚔️' },
      { type: 'regen', value: 8, description: '大地の力を吸う', icon: '💚' },
      { type: 'defend', value: 10, description: '樹皮の鎧', icon: '🛡️' },
    ],
  },
  {
    templateId: 'giant_insect',
    name: '巨大な蟲',
    icon: '🦟',
    imageUrl: giantInsectImage,
    maxHp: 45,
    intents: [
      { type: 'attack', value: 5, description: '毒針の連撃 ×3', icon: '⚔️' },
      { type: 'debuff', value: 3, debuffType: 'poison', description: '毒液を注入', icon: '☠️' },
    ],
  },
  {
    templateId: 'moss_covered_statue',
    name: '苔むした石像',
    icon: '🗿',
    imageUrl: mossCoveredStatueImage,
    maxHp: 70,
    intents: [
      { type: 'defend', value: 15, description: '石の構え', icon: '🛡️' },
      { type: 'attack', value: 16, description: '石拳の一撃', icon: '⚔️' },
      { type: 'buff', value: 3, description: '古代の力覚醒', icon: '⬆️' },
    ],
  },
  {
    templateId: 'diseased_root',
    name: '病んだ根',
    icon: '🌿',
    imageUrl: diseasedRootImage,
    maxHp: 55,
    intents: [
      { type: 'attack', value: 12, description: '病んだ根で絡みつく', icon: '⚔️' },
      { type: 'random_debuff', value: 3, description: '病の瘴気', icon: '🎲' },
      { type: 'attack', value: 14, description: '腐敗の侵食', icon: '⚔️' },
    ],
  },
];

export const COOK_AREA3_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'avatar_of_hunger',
    name: '飢餓の化身',
    icon: '💀',
    imageUrl: avatarOfHungerImage,
    maxHp: 130,
    intents: [
      { type: 'attack', value: 16, description: '飢えの爪', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 4, description: '絶望の咆哮', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '飢餓の呪縛', icon: '💢' },
      { type: 'attack', value: 18, description: '虚無の一撃', icon: '💥' },
    ],
  },
  {
    templateId: 'fallen_gourmet',
    name: '堕ちた美食家',
    icon: '🍷',
    imageUrl: fallenGourmetImage,
    maxHp: 120,
    intents: [
      { type: 'attack', value: 14, description: '狂気の調理', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '退廃の批評', icon: '💢' },
      { type: 'attack', value: 16, description: '堕落の饗宴', icon: '⚔️' },
      { type: 'regen', value: 10, description: '禁断の滋養', icon: '💚' },
    ],
  },
];

export const COOK_AREA3_BOSS: EnemyTemplateLike = {
  templateId: 'hunger_king_of_world_tree',
  name: '世界樹の飢餓王',
  icon: '🌲',
  imageUrl: hungerKingOfWorldTreeImage,
  maxHp: 350,
  intents: [
    { type: 'defend', value: 20, description: '世界樹の根壁', icon: '🛡️' },
    { type: 'attack', value: 18, description: '飢餓の薙ぎ払い', icon: '⚔️' },
    { type: 'debuff', value: 4, debuffType: 'poison', description: '世界の腐敗', icon: '☠️' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '飢えの呪い', icon: '💢' },
    { type: 'attack', value: 22, description: '終焉の大顎', icon: '💥' },
    { type: 'mental_attack', value: 0, mentalDamage: 5, description: '世界の絶望', icon: '😤' },
  ],
};

// ===== 遭遇テーブル =====

export const pickCookArea1Encounter = (): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.11) {
    const triples = [
      [0, 1, 2],
      [1, 2, 3],
      [2, 3, 4],
    ];
    const pick = triples[Math.floor(Math.random() * triples.length)];
    return pick.map((i) => COOK_AREA1_NORMAL_ENEMIES[i]);
  }
  if (r < 0.11 + 0.36) {
    const doubles = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 4],
    ];
    const pick = doubles[Math.floor(Math.random() * doubles.length)];
    return pick.map((i) => COOK_AREA1_NORMAL_ENEMIES[i]);
  }
  const i = Math.floor(Math.random() * COOK_AREA1_NORMAL_ENEMIES.length);
  return [COOK_AREA1_NORMAL_ENEMIES[i]];
};

export const pickCookArea1Elite = (): EnemyTemplateLike =>
  COOK_AREA1_ELITES[Math.floor(Math.random() * COOK_AREA1_ELITES.length)];

export const pickCookArea2Encounter = (): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.12) {
    const triples = [
      [0, 1, 2],
      [1, 2, 3],
      [2, 3, 4],
      [0, 2, 4],
      [0, 1, 4],
    ];
    const pick = triples[Math.floor(Math.random() * triples.length)];
    return pick.map((i) => COOK_AREA2_NORMAL_ENEMIES[i]);
  }
  if (r < 0.12 + 0.35) {
    const doubles = [
      [0, 1],
      [2, 3],
      [1, 4],
    ];
    const pick = doubles[Math.floor(Math.random() * doubles.length)];
    return pick.map((i) => COOK_AREA2_NORMAL_ENEMIES[i]);
  }
  const i = Math.floor(Math.random() * COOK_AREA2_NORMAL_ENEMIES.length);
  return [COOK_AREA2_NORMAL_ENEMIES[i]];
};

export const pickCookArea2Elite = (): EnemyTemplateLike =>
  COOK_AREA2_ELITES[Math.floor(Math.random() * COOK_AREA2_ELITES.length)];

export const pickCookArea3Encounter = (): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.12) {
    const triples = [
      [0, 1, 2],
      [1, 2, 3],
      [2, 3, 4],
      [0, 2, 4],
      [0, 1, 4],
    ];
    const pick = triples[Math.floor(Math.random() * triples.length)];
    return pick.map((i) => COOK_AREA3_NORMAL_ENEMIES[i]);
  }
  if (r < 0.12 + 0.35) {
    const doubles = [
      [0, 1],
      [2, 3],
      [1, 4],
    ];
    const pick = doubles[Math.floor(Math.random() * doubles.length)];
    return pick.map((i) => COOK_AREA3_NORMAL_ENEMIES[i]);
  }
  const i = Math.floor(Math.random() * COOK_AREA3_NORMAL_ENEMIES.length);
  return [COOK_AREA3_NORMAL_ENEMIES[i]];
};

export const pickCookArea3Elite = (): EnemyTemplateLike =>
  COOK_AREA3_ELITES[Math.floor(Math.random() * COOK_AREA3_ELITES.length)];
