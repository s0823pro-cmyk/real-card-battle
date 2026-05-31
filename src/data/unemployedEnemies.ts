import type { EnemyTemplateLike } from '../types/run';
import exhaustedJobSeekerImage from '../assets/enemies/unemployed/exhausted_job_seeker.png';
import streetJobToutImage from '../assets/enemies/unemployed/street_job_tout.png';
import sternInterviewerImage from '../assets/enemies/unemployed/stern_interviewer.png';
import collarlessDogImage from '../assets/enemies/unemployed/collarless_dog.png';
import emptyWalletDrifterImage from '../assets/enemies/unemployed/empty_wallet_drifter.png';
import pressureInterviewerImage from '../assets/enemies/unemployed/pressure_interviewer.png';
import probationSupervisorImage from '../assets/enemies/unemployed/probation_supervisor.png';
import hollowRecruiterImage from '../assets/enemies/unemployed/hollow_recruiter.png';
import unpaidOvertimeWorkerImage from '../assets/enemies/unemployed/unpaid_overtime_worker.png';
import blackContractBrokerImage from '../assets/enemies/unemployed/black_contract_broker.png';
import paydayMirageClerkImage from '../assets/enemies/unemployed/payday_mirage_clerk.png';
import quotaEnforcerImage from '../assets/enemies/unemployed/quota_enforcer.png';
import timecardGhostWorkerImage from '../assets/enemies/unemployed/timecard_ghost_worker.png';
import blackCompanyManagerImage from '../assets/enemies/unemployed/black_company_manager.png';
import contractCollectorImage from '../assets/enemies/unemployed/contract_collector.png';
import paydayPuppeteerImage from '../assets/enemies/unemployed/payday_puppeteer.png';
import emptyDrifterShellImage from '../assets/enemies/unemployed/empty_drifter_shell.png';
import regretRootVagrantImage from '../assets/enemies/unemployed/regret_root_vagrant.png';
import namelessStonePilgrimImage from '../assets/enemies/unemployed/nameless_stone_pilgrim.png';
import hungerEchoHoundImage from '../assets/enemies/unemployed/hunger_echo_hound.png';
import marginLanternKeeperImage from '../assets/enemies/unemployed/margin_lantern_keeper.png';
import voidHrOfficerImage from '../assets/enemies/unemployed/void_hr_officer.png';
import worldTreeInterviewerImage from '../assets/enemies/unemployed/world_tree_interviewer.png';
import wardenOfBlankImage from '../assets/enemies/unemployed/warden_of_blank.png';

// 無職ルートは「高HP・低攻撃力」。長引くほど空腹/覚醒管理が効くよう、攻撃値は控えめにする。

export const UNEMPLOYED_AREA1_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'exhausted_job_seeker',
    templateId: 'exhausted_job_seeker',
    name: '履歴書を抱えた求職者',
    icon: '📄',
    imageUrl: exhaustedJobSeekerImage,
    maxHp: 48,
    intents: [
      { type: 'attack', value: 4, description: '履歴書の束で押す', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '不採用通知を思い出す', icon: '😤' },
      { type: 'defend', value: 8, description: '書類で身を固める', icon: '🛡️' },
    ],
  },
  {
    id: 'street_job_tout',
    templateId: 'street_job_tout',
    name: '求人チラシの勧誘員',
    icon: '📢',
    imageUrl: streetJobToutImage,
    maxHp: 52,
    intents: [
      { type: 'attack', value: 5, description: 'チラシ束で叩く', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '都合のいい話を並べる', icon: '💢' },
      { type: 'steal_gold', value: 6, description: '登録料を迫る', icon: '💰' },
    ],
  },
  {
    id: 'stern_interviewer',
    templateId: 'stern_interviewer',
    name: '面接官の影',
    icon: '👔',
    imageUrl: sternInterviewerImage,
    maxHp: 58,
    intents: [
      { type: 'attack', value: 5, description: '質問で追い込む', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '沈黙の圧力', icon: '💢' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '経歴の空白を突く', icon: '😤' },
    ],
  },
  {
    id: 'collarless_dog',
    templateId: 'collarless_dog',
    name: '首輪のない犬',
    icon: '🐕',
    imageUrl: collarlessDogImage,
    maxHp: 44,
    intents: [
      { type: 'attack', value: 3, description: '低く唸って飛びつく ×2', icon: '🐾' },
      { type: 'defend', value: 6, description: '距離を取って様子を見る', icon: '🛡️' },
      { type: 'regen', value: 4, description: '残飯を見つける', icon: '💚' },
    ],
  },
  {
    id: 'empty_wallet_drifter',
    templateId: 'empty_wallet_drifter',
    name: '空財布の放浪者',
    icon: '👛',
    imageUrl: emptyWalletDrifterImage,
    maxHp: 54,
    intents: [
      { type: 'attack', value: 4, description: '小銭入れを振る', icon: '⚔️' },
      { type: 'steal_gold', value: 8, description: 'なけなしの小銭を狙う', icon: '💰' },
      { type: 'defend', value: 10, description: '古い上着で耐える', icon: '🛡️' },
    ],
  },
];

export const UNEMPLOYED_AREA1_ELITES: EnemyTemplateLike[] = [
  {
    id: 'pressure_interviewer',
    templateId: 'pressure_interviewer',
    name: '圧迫面接官',
    icon: '👔',
    imageUrl: pressureInterviewerImage,
    maxHp: 130,
    intents: [
      { type: 'attack', value: 7, description: '詰問を畳みかける', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '人格否定の視線', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '自信を削る質問', icon: '💢' },
      { type: 'defend', value: 16, description: '面接官の余裕', icon: '🛡️' },
    ],
  },
  {
    id: 'probation_supervisor',
    templateId: 'probation_supervisor',
    name: '試用期間の監督',
    icon: '⏱️',
    imageUrl: probationSupervisorImage,
    maxHp: 120,
    intents: [
      { type: 'attack', value: 6, description: '試用の印を押す', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '評価待ちに追い込む', icon: '💢' },
      { type: 'defend', value: 18, description: '契約条件で守る', icon: '🛡️' },
      { type: 'attack', value: 8, description: '更新しない一言', icon: '💥' },
    ],
  },
];

export const UNEMPLOYED_AREA1_BOSS: EnemyTemplateLike = {
  id: 'hollow_recruiter',
  templateId: 'hollow_recruiter',
  name: '空求人の支配者',
  icon: '📄',
  imageUrl: hollowRecruiterImage,
  maxHp: 240,
  intents: [
    { type: 'defend', value: 18, description: '白紙求人で守る', icon: '🛡️' },
    { type: 'attack', value: 8, description: '空約束を突きつける', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: '採用する気のない笑顔', icon: '😤' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '条件を後出しする', icon: '💢' },
    { type: 'attack', value: 10, description: '不採用の束', icon: '💥' },
  ],
};

export const UNEMPLOYED_AREA2_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'unpaid_overtime_worker',
    templateId: 'unpaid_overtime_worker',
    name: 'サビ残の亡霊',
    icon: '🌙',
    imageUrl: unpaidOvertimeWorkerImage,
    maxHp: 74,
    intents: [
      { type: 'attack', value: 6, description: '終電後の一撃', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '残業のため息', icon: '😤' },
      { type: 'defend', value: 12, description: '机にしがみつく', icon: '🛡️' },
    ],
  },
  {
    id: 'black_contract_broker',
    templateId: 'black_contract_broker',
    name: '黒契約の仲介人',
    icon: '🧾',
    imageUrl: blackContractBrokerImage,
    maxHp: 78,
    intents: [
      { type: 'attack', value: 6, description: '契約書で打つ', icon: '⚔️' },
      { type: 'add_curse', value: 1, description: '不利な条項を押しつける', icon: '🌑' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '小さな文字の罠', icon: '💢' },
    ],
  },
  {
    id: 'payday_mirage_clerk',
    templateId: 'payday_mirage_clerk',
    name: '給料日の蜃気楼係',
    icon: '💸',
    imageUrl: paydayMirageClerkImage,
    maxHp: 70,
    intents: [
      { type: 'attack', value: 5, description: '空封筒を投げる', icon: '⚔️' },
      { type: 'steal_gold', value: 10, description: '振込手数料を抜く', icon: '💰' },
      { type: 'regen', value: 6, description: '支払日を先延ばしにする', icon: '💚' },
    ],
  },
  {
    id: 'quota_enforcer',
    templateId: 'quota_enforcer',
    name: 'ノルマの取締役',
    icon: '📋',
    imageUrl: quotaEnforcerImage,
    maxHp: 88,
    intents: [
      { type: 'attack', value: 7, description: 'ノルマ表を叩きつける', icon: '⚔️' },
      { type: 'buff', value: 1, description: '目標を積み増す', icon: '⬆️' },
      { type: 'defend', value: 14, description: '数字の壁を作る', icon: '🛡️' },
    ],
  },
  {
    id: 'timecard_ghost_worker',
    templateId: 'timecard_ghost_worker',
    name: 'タイムカードの幽社員',
    icon: '🕘',
    imageUrl: timecardGhostWorkerImage,
    maxHp: 76,
    intents: [
      { type: 'attack', value: 5, description: '打刻忘れの拳', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '勤務記録で縛る', icon: '💢' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '休日出勤の通知', icon: '😤' },
    ],
  },
];

export const UNEMPLOYED_AREA2_ELITES: EnemyTemplateLike[] = [
  {
    id: 'black_company_manager',
    templateId: 'black_company_manager',
    name: 'ブラック企業の管理者',
    icon: '🏢',
    imageUrl: blackCompanyManagerImage,
    maxHp: 172,
    intents: [
      { type: 'attack', value: 8, description: '会議資料で詰める', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '根性論を浴びせる', icon: '😤' },
      { type: 'buff', value: 2, description: '部署全体を巻き込む', icon: '⬆️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '責任感を利用する', icon: '💢' },
    ],
  },
  {
    id: 'contract_collector',
    templateId: 'contract_collector',
    name: '契約回収人',
    icon: '💼',
    imageUrl: contractCollectorImage,
    maxHp: 162,
    intents: [
      { type: 'attack', value: 7, description: '回収鞄で殴る', icon: '⚔️' },
      { type: 'add_curse', value: 1, description: '追加契約を差し込む', icon: '🌑' },
      { type: 'steal_gold', value: 14, description: '違約金を請求する', icon: '💰' },
      { type: 'defend', value: 18, description: '印紙の束で守る', icon: '🛡️' },
    ],
  },
];

export const UNEMPLOYED_AREA2_BOSS: EnemyTemplateLike = {
  id: 'payday_puppeteer',
  templateId: 'payday_puppeteer',
  name: '給料日の操り手',
  icon: '💸',
  imageUrl: paydayPuppeteerImage,
  maxHp: 320,
  intents: [
    { type: 'defend', value: 22, description: '支払予定で守る', icon: '🛡️' },
    { type: 'attack', value: 9, description: '給与明細の糸', icon: '⚔️' },
    { type: 'steal_gold', value: 18, description: '天引きを増やす', icon: '💰' },
    { type: 'mental_attack', value: 0, mentalDamage: 3, description: '明日払うと言い張る', icon: '😤' },
    { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '生活費を握る', icon: '💢' },
  ],
};

export const UNEMPLOYED_AREA3_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    id: 'empty_drifter_shell',
    templateId: 'empty_drifter_shell',
    name: '空白の抜け殻',
    icon: '🧥',
    imageUrl: emptyDrifterShellImage,
    maxHp: 104,
    intents: [
      { type: 'attack', value: 7, description: '空っぽの手を伸ばす', icon: '⚔️' },
      { type: 'defend', value: 16, description: '余白に身を隠す', icon: '🛡️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '何者でもない沈黙', icon: '😤' },
    ],
  },
  {
    id: 'regret_root_vagrant',
    templateId: 'regret_root_vagrant',
    name: '後悔の根をまとう者',
    icon: '🌿',
    imageUrl: regretRootVagrantImage,
    maxHp: 112,
    intents: [
      { type: 'attack', value: 8, description: '根で足を払う', icon: '⚔️' },
      { type: 'random_debuff', value: 2, description: '後悔を絡ませる', icon: '🎲' },
      { type: 'regen', value: 8, description: '世界樹から吸う', icon: '💚' },
    ],
  },
  {
    id: 'nameless_stone_pilgrim',
    templateId: 'nameless_stone_pilgrim',
    name: '肩書きのない石巡礼',
    icon: '🗿',
    imageUrl: namelessStonePilgrimImage,
    maxHp: 122,
    intents: [
      { type: 'defend', value: 20, description: '石の沈黙', icon: '🛡️' },
      { type: 'attack', value: 7, description: '重い一歩', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '名前を削る視線', icon: '💢' },
    ],
  },
  {
    id: 'hunger_echo_hound',
    templateId: 'hunger_echo_hound',
    name: '空腹の反響犬',
    icon: '🐺',
    imageUrl: hungerEchoHoundImage,
    maxHp: 96,
    intents: [
      { type: 'attack', value: 4, description: '飢えた跳びかかり ×2', icon: '🐾' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '腹の音を響かせる', icon: '💢' },
      { type: 'regen', value: 6, description: '匂いを辿る', icon: '💚' },
    ],
  },
  {
    id: 'margin_lantern_keeper',
    templateId: 'margin_lantern_keeper',
    name: '余白の灯守',
    icon: '🕯️',
    imageUrl: marginLanternKeeperImage,
    maxHp: 100,
    intents: [
      { type: 'attack', value: 6, description: '薄い灯で焼く', icon: '⚔️' },
      { type: 'defend', value: 18, description: '余白の光で覆う', icon: '🛡️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '帰り道をぼかす', icon: '😤' },
    ],
  },
];

export const UNEMPLOYED_AREA3_ELITES: EnemyTemplateLike[] = [
  {
    id: 'void_hr_officer',
    templateId: 'void_hr_officer',
    name: '空白人事',
    icon: '📋',
    imageUrl: voidHrOfficerImage,
    maxHp: 220,
    intents: [
      { type: 'attack', value: 9, description: '白紙評価を下す', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 3, description: '存在理由を問う', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '役割を奪う', icon: '💢' },
      { type: 'add_curse', value: 1, description: '空欄の書類を渡す', icon: '🌑' },
    ],
  },
  {
    id: 'world_tree_interviewer',
    templateId: 'world_tree_interviewer',
    name: '世界樹の根面接',
    icon: '🌲',
    imageUrl: worldTreeInterviewerImage,
    maxHp: 235,
    intents: [
      { type: 'defend', value: 26, description: '根の面接室', icon: '🛡️' },
      { type: 'attack', value: 10, description: '枝の質問', icon: '⚔️' },
      { type: 'random_debuff', value: 3, description: '年輪の問い', icon: '🎲' },
      { type: 'regen', value: 12, description: '根から再生する', icon: '💚' },
    ],
  },
];

export const UNEMPLOYED_AREA3_BOSS: EnemyTemplateLike = {
  id: 'warden_of_blank',
  templateId: 'warden_of_blank',
  name: '空白の番人',
  icon: '🌌',
  imageUrl: wardenOfBlankImage,
  maxHp: 420,
  intents: [
    { type: 'defend', value: 30, description: '余白の結界', icon: '🛡️' },
    { type: 'attack', value: 11, description: '白紙の裁き', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 4, description: '空白の問い', icon: '😤' },
    { type: 'random_debuff', value: 3, description: '何者でもない渦', icon: '🎲' },
    { type: 'attack', value: 13, description: '世界樹の余白', icon: '💥' },
  ],
};

const pickFrom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const pickEncounter = (pool: EnemyTemplateLike[]): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.04) {
    return pickFrom([
      [0, 1, 2],
      [1, 2, 3],
      [2, 3, 4],
      [0, 3, 4],
      [0, 1, 4],
    ]).map((i) => pool[i]);
  }
  if (r < 0.39) {
    return pickFrom([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 4],
    ]).map((i) => pool[i]);
  }
  return [pickFrom(pool)];
};

export const pickUnemployedArea1Encounter = (): EnemyTemplateLike[] =>
  pickEncounter(UNEMPLOYED_AREA1_NORMAL_ENEMIES);

export const pickUnemployedArea1Elite = (): EnemyTemplateLike =>
  pickFrom(UNEMPLOYED_AREA1_ELITES);

export const pickUnemployedArea2Encounter = (): EnemyTemplateLike[] =>
  pickEncounter(UNEMPLOYED_AREA2_NORMAL_ENEMIES);

export const pickUnemployedArea2Elite = (): EnemyTemplateLike =>
  pickFrom(UNEMPLOYED_AREA2_ELITES);

export const pickUnemployedArea3Encounter = (): EnemyTemplateLike[] =>
  pickEncounter(UNEMPLOYED_AREA3_NORMAL_ENEMIES);

export const pickUnemployedArea3Elite = (): EnemyTemplateLike =>
  pickFrom(UNEMPLOYED_AREA3_ELITES);
