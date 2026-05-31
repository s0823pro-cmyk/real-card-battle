import type { Achievement } from '../utils/achievementTypes';

/**
 * 職業ごとに実績20件。各実績でカード2枚が解放される（1職業あたり計40枚は実績までプールから除外）。
 * 報酬は各ジョブの実績ロックカード。未解除時は抽選プールから除外する。
 * tier: easy=アンコモン2枚 / medium=アンコモン+レア / hard=レア2枚（dice_80のみ大工アンコモン2枚でレア枠の都合を調整）
 */
export const ACHIEVEMENTS: Achievement[] = [
  // --- easy（アンコモン×2）---
  {
    id: 'first_win',
    name: '初陣の誉れ',
    description: '大工ではじめてバトルに勝利する',
    icon: '🔨',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['focus', 'guts'],
  },
  {
    id: 'defeat_3',
    name: '不屈の学び',
    description: '大工で累計3回バトルに敗北する',
    icon: '💀',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['comeback', 'honki_mode'],
  },
  {
    id: 'elite_first',
    name: '強敵との初対面',
    description: '大工ではじめてエリート戦に勝利する',
    icon: '👹',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['tetsu_ishi', 'yomiai'],
  },
  {
    id: 'win_10',
    name: '連戦の慣れ',
    description: '大工で累計10回バトルに勝利する',
    icon: '⚔️',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['counter_kamae', 'shizuka_kakugo'],
  },
  {
    id: 'dice_25',
    name: '歩みを重ねて',
    description: '大工でサイコロを累計25回振る',
    icon: '🎲',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['kanazuchi_tap', 'sumitsubo_makijaku'],
  },
  {
    id: 'shrine_5',
    name: '神社の常連',
    description: '大工で神社マスを累計5回訪れる',
    icon: '⛩️',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['dodge', 'first_aid'],
  },
  {
    id: 'shop_cards_8',
    name: '質屋の顧客',
    description: '大工で質屋でカードを累計8回購入する',
    icon: '🏪',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['iron_wall', 'reinforced_concrete'],
  },
  {
    id: 'gold_lifetime_500',
    name: '小金が貯まる',
    description: '大工で累計ゴールドを500以上獲得する',
    icon: '💰',
    tier: 'easy',
    jobId: 'carpenter',
    rewardCardIds: ['power_drill', 'quick_hammer'],
  },
  // --- medium（アンコモン+レア）---
  {
    id: 'area1_clear',
    name: '一区切り',
    description: '大工でエリア1のエリアボスに勝利する',
    icon: '🏗️',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['shizuka_shoheki', 'ridgepole'],
  },
  {
    id: 'scaffold_10',
    name: '足場の鬼',
    description: '大工で1バトルで足場を10以上積んだ状態で勝利する',
    icon: '🏗️',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['tora_shisen', 'master_strike'],
  },
  {
    id: 'low_hp_kill',
    name: '綱渡りの勝利',
    description: '大工でHPが10以下の状態で敵にとどめを刺す',
    icon: '😤',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['saikido', 'miracle'],
  },
  {
    id: 'events_10',
    name: 'イベントマスター',
    description: '大工でイベントを累計10回完了する',
    icon: '❓',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['kensei', 'hidden_power'],
  },
  {
    id: 'hotel_5',
    name: 'ホテル常宿',
    description: '大工でホテルマスを累計5回訪れる',
    icon: '🏨',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['defense_wall', 'temple_carpenter'],
  },
  {
    id: 'elite_wins_5',
    name: '強敵狩り',
    description: '大工でエリート戦に累計5回勝利する',
    icon: '⚡',
    tier: 'medium',
    jobId: 'carpenter',
    rewardCardIds: ['mega_nail', 'shinshin_choritu'],
  },
  // --- hard（レア×2）---
  {
    id: 'area2_clear',
    name: 'さらなる高み',
    description: '大工でエリア2のエリアボスに勝利する',
    icon: '🏆',
    tier: 'hard',
    jobId: 'carpenter',
    rewardCardIds: ['renovation', 'niju_ashiba'],
  },
  {
    id: 'area3_clear',
    name: '伝説の職人',
    description: '大工でエリア3のエリアボスに勝利する（ゲームクリア）',
    icon: '👑',
    tier: 'hard',
    jobId: 'carpenter',
    rewardCardIds: ['ishizue_ichigeki', 'cho_mabashira'],
  },
  {
    id: 'zero_mental_survive',
    name: '底力覚醒',
    description: '大工でメンタルが0以下の状態でバトルに勝利する',
    icon: '🌟',
    tier: 'hard',
    jobId: 'carpenter',
    rewardCardIds: ['last_word', 'gyakkyou_sainou'],
  },
  {
    id: 'win_25',
    name: '百戦錬磨',
    description: '大工で累計25回バトルに勝利する',
    icon: '🛡️',
    tier: 'hard',
    jobId: 'carpenter',
    rewardCardIds: ['koryo_setsugo', 'meisho_nomi'],
  },
  {
    id: 'gold_lifetime_2000',
    name: '財が成る',
    description: '大工で累計ゴールドを2000以上獲得する',
    icon: '💎',
    tier: 'hard',
    jobId: 'carpenter',
    /** `zenmen_kaiso`＝カード「全面改装」。報酬プールは `CARPENTER_RARE_POOL`（実績ロック除外後）＋解放分のみ */
    rewardCardIds: ['tenken_sha', 'zenmen_kaiso'],
  },
  {
    id: 'dice_80',
    name: '果てまで歩く',
    description: '大工でサイコロを累計80回振る',
    icon: '🎲',
    tier: 'hard',
    jobId: 'carpenter',
    rewardCardIds: ['yane_fuki', 'toshi_bashira'],
  },

  // ===== 料理人実績 =====
  // easy (8件)
  { id: 'cook_first_win', name: '初めての一皿', description: '料理人ではじめてバトルに勝利する', icon: '🍳', tier: 'easy', jobId: 'cook', rewardCardIds: ['onion_bulb', 'tomato'] as const },
  { id: 'cook_defeat_3', name: '厨房の失敗', description: '料理人で累計3回バトルに敗北する', icon: '😰', tier: 'easy', jobId: 'cook', rewardCardIds: ['potato', 'mushroom'] as const },
  { id: 'cook_elite_first', name: '裏社会の味', description: '料理人ではじめてエリート戦に勝利する', icon: '🔪', tier: 'easy', jobId: 'cook', rewardCardIds: ['fish', 'egg_throw'] as const },
  { id: 'cook_win_10', name: '腕が上がる', description: '料理人で累計10回バトルに勝利する', icon: '📈', tier: 'easy', jobId: 'cook', rewardCardIds: ['prep_work_cook', 'stir_fry'] as const },
  { id: 'cook_cooking_10', name: '仕込み上手', description: '1バトルで調理ゲージを累計10以上貯める', icon: '🍳', tier: 'easy', jobId: 'cook', rewardCardIds: ['taste', 'plating'] as const },
  { id: 'cook_fullness_3', name: '満腹三昧', description: '1バトルで満腹ボーナスを3回発動する', icon: '🍖', tier: 'easy', jobId: 'cook', rewardCardIds: ['restock', 'mise_en_place'] as const },
  { id: 'cook_shrine_5', name: '料理人の祈り', description: '料理人で神社マスを累計5回訪れる', icon: '⛩️', tier: 'easy', jobId: 'cook', rewardCardIds: ['apron_block', 'pot_lid'] as const },
  { id: 'cook_gold_500', name: '食材の元手', description: '料理人で累計ゴールドを500以上獲得する', icon: '💰', tier: 'easy', jobId: 'cook', rewardCardIds: ['knife_throw', 'pan_swing'] as const },

  // medium (6件)
  { id: 'cook_area1_clear', name: '市場の浄化', description: '料理人でエリア1のエリアボスに勝利する', icon: '🏪', tier: 'medium', jobId: 'cook', rewardCardIds: ['premium_meat', 'hot_sauce'] as const },
  { id: 'cook_cooking_20', name: '調理の達人', description: '1バトルで調理ゲージを累計20以上貯める', icon: '🔥', tier: 'medium', jobId: 'cook', rewardCardIds: ['secret_ingredient', 'finishing'] as const },
  { id: 'cook_low_hp_kill', name: '火加減ギリギリ', description: '料理人でHPが10以下の状態で敵にとどめを刺す', icon: '💀', tier: 'medium', jobId: 'cook', rewardCardIds: ['gas_bomb', 'fork_single'] as const },
  { id: 'cook_events_10', name: '食の探求者', description: '料理人でイベントを累計10回完了する', icon: '🗺️', tier: 'medium', jobId: 'cook', rewardCardIds: ['detox_soup', 'mushroom_pot'] as const },
  { id: 'cook_hotel_5', name: '旅の宿', description: '料理人でホテルマスを累計5回訪れる', icon: '🏨', tier: 'medium', jobId: 'cook', rewardCardIds: ['flame_apron', 'stockpot'] as const },
  { id: 'cook_elite_wins_5', name: '裏社会の料理人', description: '料理人でエリート戦に累計5回勝利する', icon: '⚔️', tier: 'medium', jobId: 'cook', rewardCardIds: ['tempering', 'fork_stab'] as const },

  // hard (6件)
  { id: 'cook_area2_clear', name: '毒を制す者', description: '料理人でエリア2のエリアボスに勝利する', icon: '☠️', tier: 'hard', jobId: 'cook', rewardCardIds: ['secret_soup', 'mystery_pot'] as const },
  { id: 'cook_area3_clear', name: '飢えを満たす者', description: '料理人でエリア3のエリアボスに勝利する（ゲームクリア）', icon: '🌳', tier: 'hard', jobId: 'cook', rewardCardIds: ['legendary_recipe', 'food_god'] as const },
  { id: 'cook_zero_mental', name: '折れない心', description: '料理人でメンタルが0以下の状態でバトルに勝利する', icon: '💪', tier: 'hard', jobId: 'cook', rewardCardIds: ['death_flambe', 'kitchen_heat'] as const },
  { id: 'cook_win_25', name: '歴戦の料理人', description: '料理人で累計25回バトルに勝利する', icon: '👨‍🍳', tier: 'hard', jobId: 'cook', rewardCardIds: ['full_course', 'ultimate_course'] as const },
  { id: 'cook_gold_2000', name: '食の帝国', description: '料理人で累計ゴールドを2000以上獲得する', icon: '👑', tier: 'hard', jobId: 'cook', rewardCardIds: ['three_star', 'food_essence'] as const },
  {
    id: 'cook_dice_80',
    name: '果てまで歩く料理人',
    description: '料理人でエリア3のエリアボスに勝利する、または料理人で累計50回バトルに勝利する',
    icon: '🎲',
    tier: 'hard',
    jobId: 'cook',
    rewardCardIds: ['god_flambe', 'flame_flambe'] as const,
  },

  // ===== 無職実績 =====
  // easy (8件)
  { id: 'unemployed_first_win', name: '初めての無職勝利', description: '無職ではじめてバトルに勝利する', icon: '✊', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['loose_change', 'cardboard_decoy'] as const },
  { id: 'unemployed_defeat_3', name: '寝ても覚めても無職', description: '無職で累計3回バトルに敗北する', icon: '💀', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['job_flyer', 'cracked_watch'] as const },
  { id: 'unemployed_elite_first', name: '圧迫に耐える者', description: '無職ではじめてエリート戦に勝利する', icon: '👔', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['thrift_cloak', 'rainwater_bucket'] as const },
  { id: 'unemployed_win_10', name: '明日から本気の積み重ね', description: '無職で累計10回バトルに勝利する', icon: '📈', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['empty_promise', 'pocket_sandwich'] as const },
  { id: 'unemployed_dice_25', name: '職探しの散歩', description: '無職でサイコロを累計25回振る', icon: '🎲', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['public_phone', 'worn_sneakers'] as const },
  { id: 'unemployed_shrine_5', name: '神頼み求職', description: '無職で神社マスを累計5回訪れる', icon: '⛩️', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['bench_barricade', 'apology_letter'] as const },
  { id: 'unemployed_shop_cards_8', name: '質屋通い', description: '無職で質屋でカードを累計8回購入する', icon: '🏪', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['tin_can_alarm', 'newspaper_map'] as const },
  { id: 'unemployed_gold_500', name: '拾えば資産', description: '無職で累計ゴールドを500以上獲得する', icon: '💰', tier: 'easy', jobId: 'unemployed', rewardCardIds: ['can_rush', 'newspaper_wall'] as const },

  // medium (6件)
  { id: 'unemployed_area1_clear', name: '肩書きなしの一歩', description: '無職でエリア1のエリアボスに勝利する', icon: '🚶', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['night_shift_memory', 'cardboard_fortress'] as const },
  { id: 'unemployed_hungry_win', name: '空腹の勝利', description: '無職でHP50%以下の状態でバトルに勝利する', icon: '🍽️', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['rejection_stack', 'streetwise'] as const },
  { id: 'unemployed_low_hp_kill', name: '崖っぷち採用', description: '無職でHP10以下の状態で敵にとどめを刺す', icon: '😤', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['odd_job_contract', 'bottomless_hunger'] as const },
  { id: 'unemployed_events_10', name: '寄り道上等', description: '無職でイベントを累計10回完了する', icon: '❓', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['coin_luck', 'nothing_to_lose'] as const },
  { id: 'unemployed_hotel_5', name: '屋根のありがたみ', description: '無職でホテルマスを累計5回訪れる', icon: '🏨', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['borrowed_umbrella', 'social_headwind'] as const },
  { id: 'unemployed_elite_wins_5', name: '面接慣れ', description: '無職でエリート戦に累計5回勝利する', icon: '⚔️', tier: 'medium', jobId: 'unemployed', rewardCardIds: ['coupon_bundle', 'black_company_manual'] as const },

  // hard (6件)
  { id: 'unemployed_area2_clear', name: '契約を破る者', description: '無職でエリア2のエリアボスに勝利する', icon: '📄', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['tomorrow_for_real', 'last_application'] as const },
  { id: 'unemployed_area3_clear', name: '空白を越える者', description: '無職でエリア3のエリアボスに勝利する（ゲームクリア）', icon: '🌳', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['gamble', 'revival'] as const },
  { id: 'unemployed_zero_mental', name: 'もう失うものはない', description: '無職でメンタルが0以下の状態でバトルに勝利する', icon: '💪', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['death_wish', 'cliff_edge'] as const },
  { id: 'unemployed_win_25', name: '歴戦の無職', description: '無職で累計25回バトルに勝利する', icon: '👑', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['revenge', 'last_train_ticket'] as const },
  { id: 'unemployed_gold_2000', name: '0からの蓄財', description: '無職で累計ゴールドを2000以上獲得する', icon: '💎', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['rainy_underpass', 'umbrella_counter'] as const },
  { id: 'unemployed_awakened_win', name: '覚醒した空腹', description: '無職でHP30%以下の状態でバトルに勝利する', icon: '⚡', tier: 'hard', jobId: 'unemployed', rewardCardIds: ['hungry_dash', 'snap_back'] as const },

  // ===== 配達員実績 =====
  // easy (8件)
  { id: 'courier_first_win', name: '初配達完了', description: '配達員ではじめてバトルに勝利する', icon: '🏍️', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_dropoff_punch', 'courier_doorbell_combo'] as const },
  { id: 'courier_defeat_3', name: '遅配から学ぶ', description: '配達員で累計3回バトルに敗北する', icon: '💀', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_parcel_throw', 'courier_lane_slip'] as const },
  { id: 'courier_elite_first', name: '修羅場の初配達', description: '配達員ではじめてエリート戦に勝利する', icon: '⚡', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_stair_dash', 'courier_cool_bag_guard'] as const },
  { id: 'courier_win_10', name: '配達に慣れてきた', description: '配達員で累計10回バトルに勝利する', icon: '📈', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_helmet_headbutt', 'courier_delivery_bag_guard'] as const },
  { id: 'courier_dice_25', name: '街を走り回る', description: '配達員でサイコロを累計25回振る', icon: '🎲', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_two_stop_delivery', 'courier_side_mirror_check'] as const },
  { id: 'courier_shrine_5', name: '安全祈願ライダー', description: '配達員で神社マスを累計5回訪れる', icon: '⛩️', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_dropoff_combo', 'courier_quick_accept'] as const },
  { id: 'courier_shop_cards_8', name: '装備を整える者', description: '配達員で質屋でカードを累計8回購入する', icon: '🏪', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_load_shift', 'courier_stretch_break'] as const },
  { id: 'courier_gold_500', name: '小さな売上', description: '配達員で累計ゴールドを500以上獲得する', icon: '💰', tier: 'easy', jobId: 'courier', rewardCardIds: ['courier_raincoat_guard', 'courier_cargo_shield'] as const },

  // medium (6件)
  { id: 'courier_area1_clear', name: '一区間突破', description: '配達員でエリア1のエリアボスに勝利する', icon: '🛣️', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_express_chain', 'courier_rest_stop'] as const },
  { id: 'courier_overwork_win', name: '倒れても届ける', description: '配達員で過労ダウン中にバトルに勝利する', icon: '🔥', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_rain_cover', 'courier_priority_route'] as const },
  { id: 'courier_low_hp_kill', name: 'ギリギリ納品', description: '配達員でHPが10以下の状態で敵にとどめを刺す', icon: '😤', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_route_optimize', 'courier_extra_order'] as const },
  { id: 'courier_events_10', name: '寄り道も仕事', description: '配達員でイベントを累計10回完了する', icon: '❓', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_signal_read', 'courier_alley_turn'] as const },
  { id: 'courier_hotel_5', name: '仮眠の達人', description: '配達員でホテルマスを累計5回訪れる', icon: '🏨', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_hill_push', 'courier_cargo_fix'] as const },
  { id: 'courier_elite_wins_5', name: '難配達ハンター', description: '配達員でエリート戦に累計5回勝利する', icon: '⚔️', tier: 'medium', jobId: 'courier', rewardCardIds: ['courier_waterproof_bag', 'courier_rain_brake'] as const },

  // hard (6件)
  { id: 'courier_area2_clear', name: '危険区域突破', description: '配達員でエリア2のエリアボスに勝利する', icon: '🏆', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_last_delivery', 'courier_full_charge'] as const },
  { id: 'courier_area3_clear', name: '世界樹まで配達完了', description: '配達員でエリア3のエリアボスに勝利する（ゲームクリア）', icon: '👑', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_night_shift', 'courier_mobile_battery'] as const },
  { id: 'courier_zero_mental', name: '心を削る配達', description: '配達員でメンタルが0以下の状態でバトルに勝利する', icon: '💪', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_last_one_mile', 'courier_delivery_finish_rush'] as const },
  { id: 'courier_win_25', name: '歴戦の配達員', description: '配達員で累計25回バトルに勝利する', icon: '🏍️', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_limit_shift', 'courier_overwork_high'] as const },
  { id: 'courier_gold_2000', name: '売上の鬼', description: '配達員で累計ゴールドを2000以上獲得する', icon: '💎', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_cash_on_delivery', 'courier_god_route'] as const },
  { id: 'courier_low_stamina_win', name: '限界走行', description: '配達員でスタミナ3以下の状態でバトルに勝利する', icon: '⚡', tier: 'hard', jobId: 'courier', rewardCardIds: ['courier_dropoff_master', 'courier_dawn_delivery'] as const },

];

export const ACHIEVEMENT_LOCKED_CARD_IDS = new Set(
  ACHIEVEMENTS.flatMap((a) => [a.rewardCardIds[0], a.rewardCardIds[1]] as string[]),
);
