import claimerImage from '../assets/enemies/claimer.png';
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
import {
  UNEMPLOYED_AREA1_BOSS,
  UNEMPLOYED_AREA1_ELITES,
  UNEMPLOYED_AREA1_NORMAL_ENEMIES,
  UNEMPLOYED_AREA2_BOSS,
  UNEMPLOYED_AREA2_ELITES,
  UNEMPLOYED_AREA2_NORMAL_ENEMIES,
  UNEMPLOYED_AREA3_BOSS,
  UNEMPLOYED_AREA3_ELITES,
  UNEMPLOYED_AREA3_NORMAL_ENEMIES,
} from './unemployedEnemies';
import {
  COURIER_AREA1_BOSS,
  COURIER_AREA1_ELITES,
  COURIER_AREA1_NORMAL_ENEMIES,
  COURIER_AREA2_BOSS,
  COURIER_AREA2_ELITES,
  COURIER_AREA2_NORMAL_ENEMIES,
  COURIER_AREA3_BOSS,
  COURIER_AREA3_ELITES,
  COURIER_AREA3_NORMAL_ENEMIES,
} from './courierEnemies';

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

const UNEMPLOYED_ENEMY_DESCRIPTIONS: Record<string, string> = {
  exhausted_job_seeker: '何度も落ちた履歴書を抱えた求職者。攻撃は弱いが、折れた心だけはなかなか倒れない。',
  street_job_tout: '曖昧な好条件を並べる街頭勧誘員。言葉巧みに登録料を迫ってくる。',
  stern_interviewer: '無言の圧で経歴の空白を突く面接官。表情を読ませないまま心を削る。',
  collarless_dog: '街を生き抜く首輪のない犬。敵意より警戒心が強く、簡単には引き下がらない。',
  empty_wallet_drifter: '空の財布を握りしめた放浪者。失うものがないぶん、しぶとく踏みとどまる。',
  pressure_interviewer: '採用する気もないのに詰問だけは一人前の面接官。無職ルート最初の壁。',
  probation_supervisor: '試用期間という言葉で人を縛る監督者。評価待ちの不安を武器にする。',
  hollow_recruiter: '白紙の求人で人を集める支配者。約束だけを積み上げて、誰も救わない。',
  unpaid_overtime_worker: '帰れない夜を重ねた労働者の影。攻撃は重くないが、疲労を積み上げてくる。',
  black_contract_broker: '不利な条項を小さな文字に隠す仲介人。契約の形で呪いを押しつける。',
  payday_mirage_clerk: '給料日をちらつかせて期待だけを先延ばしにする係員。財布に直接響く相手。',
  quota_enforcer: '数字だけを積み上げる取締役。硬く粘り、戦いを長引かせる。',
  timecard_ghost_worker: '打刻だけが残った幽社員。働いた時間の重さで相手を縛る。',
  black_company_manager: '根性論で部署を動かす管理者。低い攻撃を、圧と弱体でじわじわ通してくる。',
  contract_collector: '契約と違約金を回収する男。金と呪いを同時に奪いにくる。',
  payday_puppeteer: '給料日を糸で操る支配者。生活費を握り、自由を削るエリア2のボス。',
  empty_drifter_shell: '名前も役割も薄れた抜け殻。空白に身を隠し、倒れるまで時間がかかる。',
  regret_root_vagrant: '後悔の根をまとった放浪者。世界樹に近づくほど、過去が形を持ち始める。',
  nameless_stone_pilgrim: '肩書きを削られた石の巡礼者。硬い沈黙で進路を塞ぐ。',
  hunger_echo_hound: '空腹の反響から生まれた犬。現実の犬よりも世界樹の気配を帯びている。',
  margin_lantern_keeper: '余白の灯を守る人物。帰り道を照らすようで、足元をぼかす。',
  void_hr_officer: '空白を審査する人事官。存在理由そのものを問い、手札に迷いを残す。',
  world_tree_interviewer: '世界樹の根が面接官の形を取ったもの。答えよりも、耐える時間を試してくる。',
  warden_of_blank: '空白を守る最後の番人。何者でもない者だけが、その問いを越えられる。',
};

const unemployedEntry = (
  enemy: (typeof UNEMPLOYED_AREA1_NORMAL_ENEMIES)[number],
  area: number,
  type: EnemyZukanEntry['type'],
): EnemyZukanEntry => ({
  id: enemy.templateId,
  name: enemy.name,
  icon: enemy.icon,
  imageUrl: enemy.imageUrl ?? '',
  area,
  type,
  hp: enemy.maxHp,
  description: UNEMPLOYED_ENEMY_DESCRIPTIONS[enemy.templateId] ?? '無職ルートに立ちはだかる敵。',
});

const COURIER_ENEMY_DESCRIPTIONS: Record<string, string> = {
  wrong_address_resident: '住所違いで怒る住人。配達員の焦りを増やしてくる。',
  parcel_thief: '置き配を狙う泥棒。荷物と小銭を同時に狙う。',
  barking_house_dog: '玄関先で吠える番犬。攻撃は軽いが集中力を削る。',
  traffic_cone_line: '工事現場のコーン列。ルートを塞ぎ、戦いを長引かせる。',
  impatient_customer: '通知を連打する客。焦りを攻撃力に変える。',
  tower_mansion_guard: '高層マンションの警備員。入館手続きで配達を止める。',
  rush_hour_crossing: '帰宅ラッシュの交差点。人波と信号が最大の敵。',
  last_minute_tower_customer: '時間指定ギリギリで待つ客。評価を盾に圧をかけるエリア1ボス。',
  redelivery_stack: '積み上がった再配達。片付けても片付けても増える。',
  rainy_slope: '雨で滑る坂道。体力と判断力を奪う。',
  broken_navigation: '壊れたナビ。最短ルートを逆方向へ導く。',
  overtime_dispatcher: '追加依頼を投げ続ける配車係。ノルマを増やしてくる。',
  locked_apartment: 'オートロックの迷宮。入口も部屋番号もわかりにくい。',
  complaint_center_agent: 'クレーム窓口担当。謝罪要求でメンタルを削る。',
  delivery_area_chief: '配達エリア長。評価表とノルマで圧をかける。',
  redelivery_king: '不在票の玉座に座る再配達の王。受け取る気配がないエリア2ボス。',
  root_covered_road: '世界樹の根に覆われた道路。配達ルートを歪ませる。',
  lost_delivery_spirit: '未配達の後悔から生まれた霊。宛先を探してさまよう。',
  silent_recipient: '判子を出さない無言の受取人。沈黙で足を止める。',
  time_limit_shadow: '締切そのものの影。ターンが進むほど焦りを増す。',
  world_tree_mailbox: '世界樹に生えたポスト。宛先不明の手紙を返す。',
  legendary_late_package: '長く届かなかった伝説の荷物。重さと遅延で立ちはだかる。',
  root_route_manager: '根のルート管理者。最短距離を捻じ曲げる。',
  world_tree_final_recipient: '世界樹の根元で待つ最後の受取人。配達員ルートの最終ボス。',
};

const courierEntry = (
  enemy: (typeof COURIER_AREA1_NORMAL_ENEMIES)[number],
  area: number,
  type: EnemyZukanEntry['type'],
): EnemyZukanEntry => ({
  id: enemy.templateId,
  name: enemy.name,
  icon: enemy.icon,
  imageUrl: enemy.imageUrl ?? '',
  area,
  type,
  hp: enemy.maxHp,
  description: COURIER_ENEMY_DESCRIPTIONS[enemy.templateId] ?? '配達員ルートに立ちはだかる敵。',
});

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
  // ===== コック用 =====
  { id: 'rotten_fruit_seller', name: '腐った果物売り', icon: '🍎', imageUrl: rottenFruitSellerImage, area: 1, type: 'normal', hp: 30, description: '腐った食材で金を稼ぐ悪徳商人。彼の果物を食べたら最後。' },
  { id: 'black_market_butcher', name: '闇市の肉屋', icon: '🔪', imageUrl: blackMarketButcherImage, area: 1, type: 'normal', hp: 35, description: '出所不明の肉を売りさばく巨漢。その包丁さばきは凶器そのもの。' },
  { id: 'ripoff_stall_owner', name: 'ぼったくり屋台主', icon: '🏮', imageUrl: ripoffStallOwnerImage, area: 1, type: 'normal', hp: 28, description: '法外な値段で粗悪品を売りつける。金の亡者。' },
  { id: 'pest_swarm', name: '害虫の群れ', icon: '🪲', imageUrl: pestSwarmImage, area: 1, type: 'normal', hp: 22, description: '不衛生な市場に湧いたネズミとゴキブリ。数で押してくる。' },
  { id: 'corrupt_inspector', name: '食品検査官（買収済み）', icon: '📋', imageUrl: corruptInspectorImage, area: 1, type: 'normal', hp: 32, description: '賄賂で買収された元公務員。不正を見て見ぬふり。' },
  { id: 'black_market_boss', name: '闇市の元締め', icon: '🕵️', imageUrl: blackMarketBossImage, area: 1, type: 'elite', hp: 90, description: '市場の裏を仕切る男。逆らう者には容赦しない。' },
  { id: 'food_fraud_broker', name: '食品偽装ブローカー', icon: '🧾', imageUrl: foodFraudBrokerImage, area: 1, type: 'elite', hp: 80, description: '偽ブランド食材で荒稼ぎ。口がうまく、手口は巧妙。' },
  { id: 'merchant_king_of_rot', name: '腐敗の商人王', icon: '👑', imageUrl: merchantKingOfRotImage, area: 1, type: 'boss', hp: 200, description: '街の食を支配する闇商人のトップ。富と腐敗の象徴。' },
  { id: 'poison_taster_servant', name: '毒味役の下働き', icon: '🥄', imageUrl: poisonTasterServantImage, area: 2, type: 'normal', hp: 45, description: '毒に慣れた哀れな下働き。もう味覚は残っていない。' },
  { id: 'boiling_cauldron', name: '煮えたぎる大鍋', icon: '🫕', imageUrl: boilingCauldronImage, area: 2, type: 'normal', hp: 40, description: '常に沸騰し続ける不気味な鍋。中身は誰も知らない。' },
  { id: 'knife_throwing_soldier', name: '包丁投げの料理兵', icon: '🗡️', imageUrl: knifeThrowingSoldierImage, area: 2, type: 'normal', hp: 50, description: '包丁投げの達人。一投一殺を信条とする。' },
  { id: 'armored_gatekeeper', name: '鎧を着た門番', icon: '🛡️', imageUrl: armoredGatekeeperImage, area: 2, type: 'normal', hp: 55, description: '城の入口を守る巨漢。テコでも動かない。' },
  { id: 'cursed_recipe_book', name: '呪いの料理書', icon: '📖', imageUrl: cursedRecipeBookImage, area: 2, type: 'normal', hp: 38, description: '読んだ者を蝕む禁断のレシピ本。ページをめくるな。' },
  { id: 'sous_chef', name: '副料理長', icon: '👨‍🍳', imageUrl: sousChefImage, area: 2, type: 'elite', hp: 110, description: '毒の料理長の右腕。毒物の扱いに長けた冷酷な男。' },
  { id: 'rampaging_pressure_cooker', name: '暴走する圧力鍋', icon: '💣', imageUrl: rampagingPressureCookerImage, area: 2, type: 'elite', hp: 100, description: '限界を超えた圧力。爆発は時間の問題。' },
  { id: 'poison_head_chef', name: '毒の料理長', icon: '☠️', imageUrl: poisonHeadChefImage, area: 2, type: 'boss', hp: 280, description: '毒で人々を支配する狂った料理人。彼の料理を食べてはいけない。' },
  { id: 'starving_wild_dog', name: '飢えた野犬', icon: '🐕', imageUrl: starvingWildDogImage, area: 3, type: 'normal', hp: 50, description: '飢えに狂った野犬。食べ物のためなら何でもする。' },
  { id: 'withered_tree_spirit', name: '枯れた果樹の精', icon: '🌵', imageUrl: witheredTreeSpiritImage, area: 3, type: 'normal', hp: 60, description: '世界樹の力で目覚めた枯れ木。実りを失った怒り。' },
  { id: 'giant_insect', name: '巨大な蟲', icon: '🦟', imageUrl: giantInsectImage, area: 3, type: 'normal', hp: 45, description: '世界樹を蝕む巨大な蟲。毒を持つ。' },
  { id: 'moss_covered_statue', name: '苔むした石像', icon: '🗿', imageUrl: mossCoveredStatueImage, area: 3, type: 'normal', hp: 70, description: '古代の守護者の石像。まだ使命を忘れていない。' },
  { id: 'diseased_root', name: '病んだ根', icon: '🌿', imageUrl: diseasedRootImage, area: 3, type: 'normal', hp: 55, description: '世界樹の病んだ根。触れるものすべてを蝕む。' },
  { id: 'avatar_of_hunger', name: '飢餓の化身', icon: '💀', imageUrl: avatarOfHungerImage, area: 3, type: 'elite', hp: 130, description: '世界の飢えが形を持った存在。見るだけで力が奪われる。' },
  { id: 'fallen_gourmet', name: '堕ちた美食家', icon: '🍷', imageUrl: fallenGourmetImage, area: 3, type: 'elite', hp: 120, description: 'かつての名シェフの成れの果て。狂気に飲まれた。' },
  { id: 'hunger_king_of_world_tree', name: '世界樹の飢餓王', icon: '🌲', imageUrl: hungerKingOfWorldTreeImage, area: 3, type: 'boss', hp: 350, description: '世界の飢えそのもの。すべてを喰い尽くす終焉の王。' },
  // ===== 無職用 =====
  ...UNEMPLOYED_AREA1_NORMAL_ENEMIES.map((enemy) => unemployedEntry(enemy, 1, 'normal')),
  ...UNEMPLOYED_AREA1_ELITES.map((enemy) => unemployedEntry(enemy, 1, 'elite')),
  unemployedEntry(UNEMPLOYED_AREA1_BOSS, 1, 'boss'),
  ...UNEMPLOYED_AREA2_NORMAL_ENEMIES.map((enemy) => unemployedEntry(enemy, 2, 'normal')),
  ...UNEMPLOYED_AREA2_ELITES.map((enemy) => unemployedEntry(enemy, 2, 'elite')),
  unemployedEntry(UNEMPLOYED_AREA2_BOSS, 2, 'boss'),
  ...UNEMPLOYED_AREA3_NORMAL_ENEMIES.map((enemy) => unemployedEntry(enemy, 3, 'normal')),
  ...UNEMPLOYED_AREA3_ELITES.map((enemy) => unemployedEntry(enemy, 3, 'elite')),
  unemployedEntry(UNEMPLOYED_AREA3_BOSS, 3, 'boss'),
  // ===== 配達員用 =====
  ...COURIER_AREA1_NORMAL_ENEMIES.map((enemy) => courierEntry(enemy, 1, 'normal')),
  ...COURIER_AREA1_ELITES.map((enemy) => courierEntry(enemy, 1, 'elite')),
  courierEntry(COURIER_AREA1_BOSS, 1, 'boss'),
  ...COURIER_AREA2_NORMAL_ENEMIES.map((enemy) => courierEntry(enemy, 2, 'normal')),
  ...COURIER_AREA2_ELITES.map((enemy) => courierEntry(enemy, 2, 'elite')),
  courierEntry(COURIER_AREA2_BOSS, 2, 'boss'),
  ...COURIER_AREA3_NORMAL_ENEMIES.map((enemy) => courierEntry(enemy, 3, 'normal')),
  ...COURIER_AREA3_ELITES.map((enemy) => courierEntry(enemy, 3, 'elite')),
  courierEntry(COURIER_AREA3_BOSS, 3, 'boss'),
];
