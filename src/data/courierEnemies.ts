import type { EnemyTemplateLike } from '../types/run';
import barkingHouseDogImage from '../assets/enemies/courier/barking_house_dog.png';
import brokenNavigationImage from '../assets/enemies/courier/broken_navigation.png';
import impatientCustomerImage from '../assets/enemies/courier/impatient_customer.png';
import lastMinuteTowerCustomerImage from '../assets/enemies/courier/last_minute_tower_customer.png';
import overtimeDispatcherImage from '../assets/enemies/courier/overtime_dispatcher.png';
import parcelThiefImage from '../assets/enemies/courier/parcel_thief.png';
import rainySlopeImage from '../assets/enemies/courier/rainy_slope.png';
import redeliveryStackImage from '../assets/enemies/courier/redelivery_stack.png';
import rushHourCrossingImage from '../assets/enemies/courier/rush_hour_crossing.png';
import towerMansionGuardImage from '../assets/enemies/courier/tower_mansion_guard.png';
import trafficConeLineImage from '../assets/enemies/courier/traffic_cone_line.png';
import wrongAddressResidentImage from '../assets/enemies/courier/wrong_address_resident.png';
import lockedApartmentImage from '../assets/enemies/courier/locked_apartment.png';
import complaintCenterAgentImage from '../assets/enemies/courier/complaint_center_agent.png';
import deliveryAreaChiefImage from '../assets/enemies/courier/delivery_area_chief.png';
import redeliveryKingImage from '../assets/enemies/courier/redelivery_king.png';
import rootCoveredRoadImage from '../assets/enemies/courier/root_covered_road.png';
import lostDeliverySpiritImage from '../assets/enemies/courier/lost_delivery_spirit.png';
import silentRecipientImage from '../assets/enemies/courier/silent_recipient.png';
import timeLimitShadowImage from '../assets/enemies/courier/time_limit_shadow.png';
import worldTreeMailboxImage from '../assets/enemies/courier/world_tree_mailbox.png';
import legendaryLatePackageImage from '../assets/enemies/courier/legendary_late_package.png';
import rootRouteManagerImage from '../assets/enemies/courier/root_route_manager.png';
import worldTreeFinalRecipientImage from '../assets/enemies/courier/world_tree_final_recipient.png';

const pickOne = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)] ?? items[0];

const pickEncounter = (pool: EnemyTemplateLike[]): EnemyTemplateLike[] => {
  const roll = Math.random();
  if (roll < 0.05) return [pickOne(pool), pickOne(pool), pickOne(pool)];
  if (roll < 0.42) return [pickOne(pool), pickOne(pool)];
  return [pickOne(pool)];
};

export const COURIER_AREA1_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'wrong_address_resident',
    templateId: 'wrong_address_resident',
    name: '住所違いの住人',
    icon: '🏠',
    imageUrl: wrongAddressResidentImage,
    maxHp: 34,
    intents: [
      { type: 'attack', value: 6, description: 'ドア越しに怒鳴る', icon: '⚔️' },
      { type: 'debuff', value: 1, debuffType: 'weak', description: '住所が違うと責める', icon: '💢' },
      { type: 'defend', value: 6, description: 'チェーンロックで守る', icon: '🛡️' },
    ],
  },
  {
    id: 'parcel_thief',
    templateId: 'parcel_thief',
    name: '置き配泥棒',
    icon: '📦',
    imageUrl: parcelThiefImage,
    maxHp: 32,
    intents: [
      { type: 'attack', value: 7, description: '荷物を抱えて突進', icon: '⚔️' },
      { type: 'steal_gold', value: 6, description: '小銭を抜き取る', icon: '💰' },
      { type: 'defend', value: 5, description: '段ボールに隠れる', icon: '🛡️' },
    ],
  },
  {
    id: 'barking_house_dog',
    templateId: 'barking_house_dog',
    name: '吠える番犬',
    icon: '🐕',
    imageUrl: barkingHouseDogImage,
    maxHp: 30,
    intents: [
      { type: 'attack', value: 4, description: '飛びかかる ×2', icon: '🐾' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '玄関先で吠え続ける', icon: '😤' },
      { type: 'regen', value: 3, description: '庭に戻って構える', icon: '💚' },
    ],
  },
  {
    id: 'traffic_cone_line',
    templateId: 'traffic_cone_line',
    name: '工事コーンの列',
    icon: '🚧',
    imageUrl: trafficConeLineImage,
    maxHp: 38,
    intents: [
      { type: 'attack', value: 5, description: '進路を塞いで転ばせる', icon: '⚔️' },
      { type: 'defend', value: 9, description: '赤い列で守る', icon: '🛡️' },
      { type: 'debuff', value: 1, debuffType: 'vulnerable', description: '迂回を強いる', icon: '💢' },
    ],
  },
  {
    id: 'impatient_customer',
    templateId: 'impatient_customer',
    name: 'せっかちな客',
    icon: '⌚',
    imageUrl: impatientCustomerImage,
    maxHp: 36,
    intents: [
      { type: 'attack', value: 6, description: '催促メッセージ連打', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: 'まだですか通知', icon: '😤' },
      { type: 'buff', value: 1, description: '怒りを増す', icon: '⬆️' },
    ],
  },
];

export const COURIER_AREA1_ELITES: EnemyTemplateLike[] = [
  {
    id: 'tower_mansion_guard',
    templateId: 'tower_mansion_guard',
    name: 'タワマン警備員',
    icon: '🛗',
    imageUrl: towerMansionGuardImage,
    maxHp: 90,
    intents: [
      { type: 'attack', value: 8, description: '入館証チェック', icon: '⚔️' },
      { type: 'defend', value: 18, description: '受付で足止め', icon: '🛡️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '搬入口を指定する', icon: '💢' },
    ],
  },
  {
    id: 'rush_hour_crossing',
    templateId: 'rush_hour_crossing',
    name: '帰宅ラッシュの交差点',
    icon: '🚦',
    imageUrl: rushHourCrossingImage,
    maxHp: 84,
    intents: [
      { type: 'attack', value: 7, description: '人波に押し戻す', icon: '⚔️' },
      { type: 'defend', value: 16, description: '信号待ちで固める', icon: '🛡️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '進まない焦り', icon: '😤' },
    ],
  },
];

export const COURIER_AREA1_BOSS: EnemyTemplateLike = {
  id: 'last_minute_tower_customer',
  templateId: 'last_minute_tower_customer',
  name: '時間指定ギリギリの客',
  icon: '🏢',
  imageUrl: lastMinuteTowerCustomerImage,
  maxHp: 190,
  intents: [
    { type: 'attack', value: 9, description: '今どこですか連打', icon: '⚔️' },
    { type: 'defend', value: 18, description: '高層階で待ち構える', icon: '🛡️' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '配達遅延クレーム', icon: '💢' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: '評価をちらつかせる', icon: '😤' },
  ],
};

export const COURIER_AREA2_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'redelivery_stack',
    templateId: 'redelivery_stack',
    name: '再配達の山',
    icon: '📚',
    imageUrl: redeliveryStackImage,
    maxHp: 58,
    intents: [
      { type: 'attack', value: 7, description: '伝票の束で叩く', icon: '⚔️' },
      { type: 'defend', value: 12, description: '荷物を積み上げる', icon: '🛡️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '時間指定を重ねる', icon: '💢' },
    ],
  },
  {
    id: 'rainy_slope',
    templateId: 'rainy_slope',
    name: '雨の坂道',
    icon: '🌧️',
    imageUrl: rainySlopeImage,
    maxHp: 54,
    intents: [
      { type: 'attack', value: 8, description: 'タイヤを滑らせる', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '足元を奪う', icon: '💢' },
      { type: 'defend', value: 10, description: '水たまりで進路を塞ぐ', icon: '🛡️' },
    ],
  },
  {
    id: 'broken_navigation',
    templateId: 'broken_navigation',
    name: '壊れたナビ',
    icon: '🧭',
    imageUrl: brokenNavigationImage,
    maxHp: 50,
    intents: [
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '逆方向を案内する', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '遠回りを指示する', icon: '💢' },
      { type: 'attack', value: 6, description: '再検索で叩く', icon: '⚔️' },
    ],
  },
  {
    id: 'overtime_dispatcher',
    templateId: 'overtime_dispatcher',
    name: '追加依頼の配車係',
    icon: '📱',
    imageUrl: overtimeDispatcherImage,
    maxHp: 62,
    intents: [
      { type: 'attack', value: 8, description: '追加通知を投げる', icon: '⚔️' },
      { type: 'buff', value: 1, description: '依頼を積み増す', icon: '⬆️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: 'まだ行けますよね', icon: '😤' },
    ],
  },
  {
    id: 'locked_apartment',
    templateId: 'locked_apartment',
    name: 'オートロック迷宮',
    icon: '🔐',
    imageUrl: lockedApartmentImage,
    maxHp: 66,
    intents: [
      { type: 'defend', value: 16, description: '入口を閉ざす', icon: '🛡️' },
      { type: 'attack', value: 7, description: 'インターホン反撃', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '部屋番号を隠す', icon: '💢' },
    ],
  },
];

export const COURIER_AREA2_ELITES: EnemyTemplateLike[] = [
  {
    id: 'complaint_center_agent',
    templateId: 'complaint_center_agent',
    name: 'クレーム窓口担当',
    icon: '☎️',
    imageUrl: complaintCenterAgentImage,
    maxHp: 130,
    intents: [
      { type: 'attack', value: 10, description: '録音済みの圧', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '謝罪を要求する', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '評価を下げる', icon: '💢' },
      { type: 'defend', value: 18, description: 'マニュアルで守る', icon: '🛡️' },
    ],
  },
  {
    id: 'delivery_area_chief',
    templateId: 'delivery_area_chief',
    name: '配達エリア長',
    icon: '🧾',
    imageUrl: deliveryAreaChiefImage,
    maxHp: 140,
    intents: [
      { type: 'attack', value: 9, description: '未達リストを叩きつける', icon: '⚔️' },
      { type: 'buff', value: 2, description: 'ノルマを引き上げる', icon: '⬆️' },
      { type: 'defend', value: 20, description: '評価表で固める', icon: '🛡️' },
    ],
  },
];

export const COURIER_AREA2_BOSS: EnemyTemplateLike = {
  id: 'redelivery_king',
  templateId: 'redelivery_king',
  name: '再配達王',
  icon: '👑',
  imageUrl: redeliveryKingImage,
  maxHp: 270,
  intents: [
    { type: 'defend', value: 24, description: '不在票の玉座', icon: '🛡️' },
    { type: 'attack', value: 11, description: '再配達依頼を叩きつける', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: '受け取る気のない沈黙', icon: '😤' },
    { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '時間帯をずらす', icon: '💢' },
  ],
};

export const COURIER_AREA3_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'root_covered_road',
    templateId: 'root_covered_road',
    name: '根に覆われた道路',
    icon: '🌿',
    imageUrl: rootCoveredRoadImage,
    maxHp: 70,
    intents: [
      { type: 'attack', value: 9, description: '根でタイヤを絡める', icon: '⚔️' },
      { type: 'defend', value: 14, description: '根の段差で守る', icon: '🛡️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '進路を歪める', icon: '💢' },
    ],
  },
  {
    id: 'lost_delivery_spirit',
    templateId: 'lost_delivery_spirit',
    name: '迷子の配達霊',
    icon: '👻',
    imageUrl: lostDeliverySpiritImage,
    maxHp: 64,
    intents: [
      { type: 'attack', value: 8, description: '古い伝票を飛ばす', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '未配達の後悔', icon: '😤' },
      { type: 'regen', value: 6, description: '宛先を探し直す', icon: '💚' },
    ],
  },
  {
    id: 'silent_recipient',
    templateId: 'silent_recipient',
    name: '無言の受取人',
    icon: '🧍',
    imageUrl: silentRecipientImage,
    maxHp: 78,
    intents: [
      { type: 'defend', value: 18, description: '判子を出さない', icon: '🛡️' },
      { type: 'attack', value: 9, description: '沈黙で圧をかける', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '受領拒否の気配', icon: '💢' },
    ],
  },
  {
    id: 'time_limit_shadow',
    templateId: 'time_limit_shadow',
    name: '締切の影',
    icon: '⏳',
    imageUrl: timeLimitShadowImage,
    maxHp: 72,
    intents: [
      { type: 'attack', value: 10, description: '秒針で切りつける', icon: '⚔️' },
      { type: 'buff', value: 1, description: '焦りを増す', icon: '⬆️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '残り時間を告げる', icon: '😤' },
    ],
  },
  {
    id: 'world_tree_mailbox',
    templateId: 'world_tree_mailbox',
    name: '世界樹のポスト',
    icon: '📮',
    imageUrl: worldTreeMailboxImage,
    maxHp: 82,
    intents: [
      { type: 'defend', value: 20, description: '投函口を閉じる', icon: '🛡️' },
      { type: 'attack', value: 8, description: '古い手紙を吐き出す', icon: '⚔️' },
      { type: 'random_debuff', value: 1, description: '宛先不明を返す', icon: '💢' },
    ],
  },
];

export const COURIER_AREA3_ELITES: EnemyTemplateLike[] = [
  {
    id: 'legendary_late_package',
    templateId: 'legendary_late_package',
    name: '伝説の遅延荷物',
    icon: '📦',
    imageUrl: legendaryLatePackageImage,
    maxHp: 155,
    intents: [
      { type: 'attack', value: 11, description: '重すぎる荷重', icon: '⚔️' },
      { type: 'defend', value: 24, description: '梱包材で守る', icon: '🛡️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '追跡番号が消える', icon: '💢' },
    ],
  },
  {
    id: 'root_route_manager',
    templateId: 'root_route_manager',
    name: '根のルート管理者',
    icon: '🌲',
    imageUrl: rootRouteManagerImage,
    maxHp: 165,
    intents: [
      { type: 'attack', value: 12, description: '根の指示線で打つ', icon: '⚔️' },
      { type: 'buff', value: 2, description: '最短距離を歪める', icon: '⬆️' },
      { type: 'defend', value: 22, description: '枝分かれで守る', icon: '🛡️' },
    ],
  },
];

export const COURIER_AREA3_BOSS: EnemyTemplateLike = {
  id: 'world_tree_final_recipient',
  templateId: 'world_tree_final_recipient',
  name: '世界樹の最終受取人',
  icon: '🌳',
  imageUrl: worldTreeFinalRecipientImage,
  maxHp: 360,
  intents: [
    { type: 'defend', value: 28, description: '根の受領印', icon: '🛡️' },
    { type: 'attack', value: 13, description: '世界樹の催促', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: '未達の記憶を見せる', icon: '😤' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '道を閉ざす', icon: '💢' },
    { type: 'attack', value: 15, description: '最後の受領確認', icon: '💥' },
  ],
};

export const pickCourierArea1Encounter = (): EnemyTemplateLike[] => pickEncounter(COURIER_AREA1_NORMAL_ENEMIES);
export const pickCourierArea2Encounter = (): EnemyTemplateLike[] => pickEncounter(COURIER_AREA2_NORMAL_ENEMIES);
export const pickCourierArea3Encounter = (): EnemyTemplateLike[] => pickEncounter(COURIER_AREA3_NORMAL_ENEMIES);
export const pickCourierArea1Elite = (): EnemyTemplateLike => pickOne(COURIER_AREA1_ELITES);
export const pickCourierArea2Elite = (): EnemyTemplateLike => pickOne(COURIER_AREA2_ELITES);
export const pickCourierArea3Elite = (): EnemyTemplateLike => pickOne(COURIER_AREA3_ELITES);
