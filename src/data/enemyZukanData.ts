import claimerImage from '../assets/enemies/claimer.png';
import drunkImage from '../assets/enemies/drunk.png';
import strayCatImage from '../assets/enemies/stray_cat.png';
import abandonedBikeImage from '../assets/enemies/abandoned_bike.png';
import solicitorImage from '../assets/enemies/solicitor.png';
import bikerLeaderImage from '../assets/enemies/biker_leader.png';
import badRealtorImage from '../assets/enemies/bad_realtor.png';
import monsterCustomerImage from '../assets/enemies/monster_customer.png';
import collectorImage from '../assets/enemies/collector.png';
import sloppyWorkerImage from '../assets/enemies/sloppy_worker.png';
import yakuzaMinionImage from '../assets/enemies/yakuza_minion.png';
import evilSalesImage from '../assets/enemies/evil_sales.png';
import rogueDumpImage from '../assets/enemies/rogue_dump.png';
import evilSupervisorImage from '../assets/enemies/evil_supervisor.png';
import landSharkImage from '../assets/enemies/land_shark.png';
import evilCeoImage from '../assets/enemies/evil_ceo.png';
import worldTreeRootImage from '../assets/enemies/world_tree_root.png';
import lostSoulImage from '../assets/enemies/lost_soul.png';
import stoneSoldierImage from '../assets/enemies/stone_soldier.png';
import lightGuardianImage from '../assets/enemies/light_guardian.png';
import cursedTreeImage from '../assets/enemies/cursed_tree.png';
import worldTreeGuardianImage from '../assets/enemies/world_tree_guardian.png';
import ancientGhostImage from '../assets/enemies/ancient_ghost.png';
import worldTreeWardenImage from '../assets/enemies/world_tree_warden.png';

export interface EnemyZukanEntry {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  area: number;
  type: 'normal' | 'elite' | 'boss';
  hp: number;
  description: string;
}

export const ENEMY_ZUKAN_DATA: EnemyZukanEntry[] = [
  { id: 'claimer', name: 'クレーマー', icon: '😡', imageUrl: claimerImage, area: 1, type: 'normal', hp: 30, description: 'どんな些細なことでも文句をつけてくる厄介な存在。実は自分でも何に怒っているか分かっていない。' },
  { id: 'drunk', name: '酔っぱらい', icon: '🍶', imageUrl: drunkImage, area: 1, type: 'normal', hp: 35, description: '昼間から酒を飲み、絡んでくる迷惑な人物。素面の時は普通の人らしい。' },
  { id: 'wildCat', name: '野良猫', icon: '🐱', imageUrl: strayCatImage, area: 1, type: 'normal', hp: 20, description: '街を縄張りにする気性の荒い猫。懐いてくれたら最高の仲間になれそうだが。' },
  { id: 'bicycle', name: '放置自転車', icon: '🚲', imageUrl: abandonedBikeImage, area: 1, type: 'normal', hp: 24, description: '誰かが捨てていったボロボロの自転車。なぜか生きているかのように立ちはだかる。' },
  { id: 'solicitor', name: '勧誘員', icon: '📢', imageUrl: solicitorImage, area: 1, type: 'normal', hp: 28, description: 'しつこく勧誘してくる迷惑な人物。断っても断っても追いかけてくる。' },
  { id: 'biker_leader', name: '暴走族リーダー', icon: '🏍️', imageUrl: bikerLeaderImage, area: 1, type: 'elite', hp: 90, description: '地元を牛耳る暴走族のリーダー。子分たちへの面目があるため絶対に引かない。' },
  { id: 'evil_realtor', name: '悪徳不動産屋', icon: '🏠', imageUrl: badRealtorImage, area: 1, type: 'elite', hp: 75, description: '詐欺まがいの契約で儲ける悪徳業者。法の抜け穴を熟知している。' },
  { id: 'monster_customer', name: 'モンスターカスタマー', icon: '👹', imageUrl: monsterCustomerImage, area: 1, type: 'boss', hp: 200, description: 'クレーマーが極限まで進化した存在。その怒りはもはや人間の域を超えている。' },
  { id: 'collector', name: '取り立て屋', icon: '💼', imageUrl: collectorImage, area: 2, type: 'normal', hp: 45, description: '借金の取り立てを生業とする男。情け容赦なく金を奪っていく。' },
  { id: 'sloppy_worker', name: '手抜き職人', icon: '🔧', imageUrl: sloppyWorkerImage, area: 2, type: 'normal', hp: 40, description: '最低限の仕事しかしない職人。自分の手抜きが自分に返ってくることを知らない。' },
  { id: 'yakuza_minion', name: 'ヤクザの子分', icon: '🐉', imageUrl: yakuzaMinionImage, area: 2, type: 'normal', hp: 55, description: '組織の末端構成員。虚勢を張っているが実力は大したことない。' },
  { id: 'evil_sales', name: '悪徳セールス', icon: '📋', imageUrl: evilSalesImage, area: 2, type: 'normal', hp: 38, description: '老人や弱者を狙う詐欺的セールスマン。笑顔の裏に毒を持つ。' },
  { id: 'rogue_dump', name: '暴走ダンプ', icon: '🚛', imageUrl: rogueDumpImage, area: 2, type: 'normal', hp: 65, description: '制御を失った巨大ダンプトラック。止める術を誰も知らない。' },
  { id: 'evil_supervisor', name: '悪徳監督', icon: '👷', imageUrl: evilSupervisorImage, area: 2, type: 'elite', hp: 110, description: '現場を牛耳る腐敗した監督。自分の利益のために部下を使い捨てる。' },
  { id: 'land_shark', name: '地上げ屋の親分', icon: '🏚️', imageUrl: landSharkImage, area: 2, type: 'elite', hp: 95, description: '強引な手段で土地を奪う悪の親分。金と暴力が全てだと信じている。' },
  { id: 'evil_ceo', name: '悪徳ゼネコン社長', icon: '👔', imageUrl: evilCeoImage, area: 2, type: 'boss', hp: 280, description: '手抜き工事で巨万の富を築いた男。職人たちの苦労など微塵も気にしない。' },
  { id: 'world_tree_root', name: '世界樹の根', icon: '🌿', imageUrl: worldTreeRootImage, area: 3, type: 'normal', hp: 55, description: '世界樹から伸びた意志を持つ根。侵入者を排除しようとする。' },
  { id: 'lost_soul', name: '迷い魂', icon: '👻', imageUrl: lostSoulImage, area: 3, type: 'normal', hp: 45, description: 'この世に未練を残してさまよう魂。触れると混乱させられる。' },
  { id: 'stone_soldier', name: '石化した兵士', icon: '🗿', imageUrl: stoneSoldierImage, area: 3, type: 'normal', hp: 68, description: 'かつて世界樹を守っていた兵士。呪いで石化し、今も番を続けている。' },
  { id: 'light_guardian', name: '光の番兵', icon: '⚔️', imageUrl: lightGuardianImage, area: 3, type: 'normal', hp: 50, description: '神聖な光を纏う守護者。時間が経つほど力を増していく。' },
  { id: 'cursed_tree', name: '呪われた大木', icon: '🌳', imageUrl: cursedTreeImage, area: 3, type: 'normal', hp: 72, description: '呪いで黒く染まった大木。近づく者に呪いを植え付ける。' },
  { id: 'world_tree_guardian', name: '世界樹の守護者', icon: '🛡️', imageUrl: worldTreeGuardianImage, area: 3, type: 'elite', hp: 130, description: '世界樹に選ばれた最強の守護者。その防御は鉄壁を超える。' },
  { id: 'ancient_ghost', name: '古代の亡霊', icon: '💀', imageUrl: ancientGhostImage, area: 3, type: 'elite', hp: 115, description: '古代から蘇った怨念の塊。追い詰められるほど凶暴になる。' },
  { id: 'world_tree_warden', name: '世界樹の番人', icon: '🌲', imageUrl: worldTreeWardenImage, area: 3, type: 'boss', hp: 350, description: 'この世界を守護する最強の存在。大工をこの世界に呼び込んだ張本人。' },
];
