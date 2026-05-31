import type { CardUpgrade } from './carpenterUpgrades';

export const COURIER_UPGRADES: Record<string, CardUpgrade> = {
  速達パンチ: {
    name: '速達パンチ+',
    damage: 6,
    description: '6ダメージ',
  },
  荷物ガード: {
    name: '荷物ガード+',
    block: 6,
    description: '6ブロック',
  },
  補給ゼリー: {
    name: '補給ゼリー+',
    timeCost: 1,
    description: 'スタミナ+2。2回使用後除外（所要時間1秒）',
    effects: [{ type: 'stamina_recover', value: 2 }],
    badges: ['stamina', 'exhaust'],
  },
  抜け道ダッシュ: {
    name: '抜け道ダッシュ+',
    damage: 10,
    description: '10ダメージ',
  },
  路肩で息継ぎ: {
    name: '路肩で息継ぎ+',
    block: 10,
    description: '10ブロック。過労ダウン中も使用できる',
  },
  置き配パンチ: {
    name: '置き配パンチ+',
    damage: 6,
    description: '6ダメージ',
  },
  チャイム連打: {
    name: 'チャイム連打+',
    damage: 3,
    description: 'ランダムな敵に3ダメージ×3',
  },
  荷物投げ: {
    name: '荷物投げ+',
    damage: 10,
    description: '10ダメージ。スタミナ-1',
  },
  すり抜け走行: {
    name: 'すり抜け走行+',
    damage: 5,
    description: '5ダメージ。カード1枚ドロー',
  },
  階段ダッシュ: {
    name: '階段ダッシュ+',
    damage: 13,
    description: '13ダメージ。スタミナ-2',
  },
  保冷バッグガード: {
    name: '保冷バッグガード+',
    block: 8,
    description: '8ブロック',
  },
  雨ガッパ防御: {
    name: '雨ガッパ防御+',
    block: 11,
    description: '11ブロック。過労ダウン中も使用できる',
  },
  荷台シールド: {
    name: '荷台シールド+',
    block: 14,
    description: '14ブロック。スタミナ-1',
  },
  信号待ち: {
    name: '信号待ち+',
    block: 5,
    description: '5ブロック。スタミナ+1。2回使用後除外',
  },
  路肩待機: {
    name: '路肩待機+',
    block: 9,
    description: '9ブロック。カード1枚ドロー',
  },
  水分補給: {
    name: '水分補給+',
    description: 'スタミナ+2。2回使用後除外',
    effects: [{ type: 'stamina_recover', value: 2 }],
  },
  肩紐を緩める: {
    name: '肩紐を緩める+',
    description: 'スタミナ+2。弱体を1解除。2回使用後除外',
    effects: [
      { type: 'stamina_recover', value: 2 },
      { type: 'clear_player_weak', value: 0 },
    ],
  },
  コンビニ休憩: {
    name: 'コンビニ休憩+',
    description: 'スタミナ+4。このターン攻撃カードを使えない。2回使用後除外',
    effects: [
      { type: 'stamina_recover', value: 4 },
      { type: 'block_attack_cards_this_turn', value: 1 },
    ],
  },
  ルート確認: {
    name: 'ルート確認+',
    description: 'カード3枚ドロー。スタミナ-1',
    effects: [
      { type: 'draw', value: 3 },
      { type: 'stamina_consume', value: 1 },
    ],
  },
  再配達メモ: {
    name: '再配達メモ+',
    description: '捨て札からランダムなカード2枚を手札に戻す。スタミナ-1',
    effects: [
      { type: 'pick_from_discard', value: 2 },
      { type: 'stamina_consume', value: 1 },
    ],
  },
  通知確認: {
    name: '通知確認+',
    description: '次に使うカードの所要時間-1秒',
    effects: [{ type: 'next_card_time_reduce', value: 1 }],
  },
  ダブルピック: {
    name: 'ダブルピック+',
    description: 'カード2枚ドロー。次のアタック+5ダメージ。スタミナ-2',
    effects: [
      { type: 'draw', value: 2 },
      { type: 'next_attack_damage_boost_this_turn', value: 5 },
      { type: 'stamina_consume', value: 2 },
    ],
  },
  根性ガード: {
    name: '根性ガード+',
    block: 16,
    description: '過労ダウン中のみ使用可。16ブロック',
  },
  まだ届ける: {
    name: 'まだ届ける+',
    damage: 12,
    description: '過労ダウン中のみ使用可。12ダメージ',
  },
  置き配完了: {
    name: '置き配完了+',
    damage: 7,
    description: '7ダメージ。スタミナが5以上なら追加で7ダメージ',
    effects: [{ type: 'stamina_damage_bonus', value: 7, threshold: 5 }],
  },
  ヘルメット頭突き: {
    name: 'ヘルメット頭突き+',
    damage: 8,
    description: '8ダメージ',
  },
  配達バッグで防ぐ: {
    name: '配達バッグで防ぐ+',
    block: 8,
    description: '8ブロック',
  },
  二件まとめ配達: {
    name: '二件まとめ配達+',
    damage: 6,
    description: 'ランダムな敵に6ダメージ×2',
  },
  サイドミラー確認: {
    name: 'サイドミラー確認+',
    block: 7,
    description: '7ブロック。次にドロー予定のカードを見る',
    effects: [{ type: 'peek_next_draw', value: 1 }],
  },
  置き配コンボ: {
    name: '置き配コンボ+',
    damage: 4,
    description: 'ランダムな敵に4ダメージ×2。次のカードの所要時間-0.5秒',
    effects: [
      { type: 'hit_count', value: 2 },
      { type: 'next_card_time_reduce', value: 0.5 },
    ],
  },
  即受け: {
    name: '即受け+',
    description: 'カード1枚ドロー。次のカードの所要時間-1秒',
    effects: [
      { type: 'draw', value: 1 },
      { type: 'next_card_time_reduce', value: 1 },
    ],
  },
  荷崩れ回避: {
    name: '荷崩れ回避+',
    block: 10,
    description: '10ブロック。過労ダウン中も使用できる',
  },
  小休止ストレッチ: {
    name: '小休止ストレッチ+',
    block: 4,
    description: '4ブロック。スタミナ+1。2回使用後除外',
  },
  連続配達: {
    name: '連続配達+',
    damage: 5,
    description: 'ランダムな敵に5ダメージ×3',
  },
  サービスエリア休憩: {
    name: 'サービスエリア休憩+',
    timeCost: 1,
    description: 'スタミナ+6。使用後除外（所要時間1秒）',
    effects: [{ type: 'stamina_recover', value: 6 }],
    badges: ['stamina', 'exhaust'],
    battleUseLimit: 0,
  },
  雨カバー展開: {
    name: '雨カバー展開+',
    block: 14,
    description: '14ブロック。過労ダウン中も使用できる',
  },
  優先ルート: {
    name: '優先ルート+',
    description: '次のアタックの所要時間-2秒',
    effects: [{ type: 'next_attack_time_reduce', value: 2 }],
  },
  配達ルート最適化: {
    name: '配達ルート最適化+',
    description: 'カード3枚ドロー。次のカードの所要時間-0.5秒',
    effects: [
      { type: 'draw', value: 3 },
      { type: 'next_card_time_reduce', value: 0.5 },
    ],
  },
  追加注文キャッチ: {
    name: '追加注文キャッチ+',
    description: 'カード1枚ドロー。次のアタック+6ダメージ。スタミナ-1',
    effects: [
      { type: 'draw', value: 1 },
      { type: 'next_attack_damage_boost_this_turn', value: 6 },
      { type: 'stamina_consume', value: 1 },
    ],
  },
  信号読み: {
    name: '信号読み+',
    description: '次のアタックの所要時間-1.5秒。次にドロー予定のカードを見る',
    effects: [
      { type: 'next_attack_time_reduce', value: 1.5 },
      { type: 'peek_next_draw', value: 1 },
    ],
  },
  路地裏ターン: {
    name: '路地裏ターン+',
    damage: 11,
    description: '11ダメージ。カード1枚ドロー。スタミナ-1',
  },
  坂道強行: {
    name: '坂道強行+',
    damage: 18,
    description: '18ダメージ。スタミナ-3',
  },
  荷台固定: {
    name: '荷台固定+',
    block: 16,
    description: '16ブロック。スタミナ-1',
  },
  防水バッグ: {
    name: '防水バッグ+',
    block: 12,
    description: '12ブロック。弱体を1解除。過労ダウン中も使用できる',
  },
  レインブレーキ: {
    name: 'レインブレーキ+',
    block: 14,
    description: '14ブロック。スタミナ-1。過労ダウン中も使用できる',
  },
  ホットコーヒー: {
    name: 'ホットコーヒー+',
    description: 'スタミナ+2。弱体を1解除。2回使用後除外',
    effects: [
      { type: 'stamina_recover', value: 2 },
      { type: 'clear_player_weak', value: 0 },
    ],
  },
  休憩スポット発見: {
    name: '休憩スポット発見+',
    timeCost: 0.5,
    description: 'スタミナ+3。使用後除外（所要時間0.5秒）',
  },
  配達アプリ再起動: {
    name: '配達アプリ再起動+',
    description: '手札のランダムなカード2枚を強化。スタミナ-1',
    effects: [
      { type: 'upgrade_random_hand_card', value: 2 },
      { type: 'stamina_consume', value: 1 },
    ],
  },
  リルート通知: {
    name: 'リルート通知+',
    description: 'カード1枚ドロー。次にドロー予定のカード2枚を見る',
    effects: [
      { type: 'draw', value: 1 },
      { type: 'peek_next_draw', value: 2 },
    ],
  },
  集合住宅攻略: {
    name: '集合住宅攻略+',
    damage: 3,
    description: 'ランダムな敵に3ダメージ×4',
  },
  駐輪位置確認: {
    name: '駐輪位置確認+',
    block: 8,
    description: '8ブロック。次のカードの所要時間-0.5秒',
  },
  連絡メモ整理: {
    name: '連絡メモ整理+',
    description: '捨て札からランダムなカード1枚を手札に戻す。次のカードの所要時間-1秒',
    effects: [
      { type: 'pick_from_discard', value: 1 },
      { type: 'next_card_time_reduce', value: 1 },
    ],
  },
  バッテリー節約走行: {
    name: 'バッテリー節約走行+',
    block: 8,
    description: '8ブロック。スタミナ+3。使用後除外',
    effects: [{ type: 'stamina_recover', value: 3 }],
  },
  ハザード点灯: {
    name: 'ハザード点灯+',
    block: 8,
    description: '8ブロック。敵1体に弱体2',
  },
  締切ブースト: {
    name: '締切ブースト+',
    damage: 13,
    description: '13ダメージ。スタミナが5以上なら追加で7ダメージ',
    effects: [{ type: 'stamina_damage_bonus', value: 7, threshold: 5 }],
  },
  膝つき配達: {
    name: '膝つき配達+',
    damage: 16,
    description: '過労ダウン中のみ使用可。16ダメージ',
  },
  最後の一件: {
    name: '最後の一件+',
    damage: 24,
    description: '24ダメージ',
  },
  フル充電: {
    name: 'フル充電+',
    timeCost: 1.5,
    description: 'スタミナ+8。自分に4ダメージ。使用後除外（所要時間1.5秒）',
    effects: [
      { type: 'stamina_recover', value: 8 },
      { type: 'self_damage', value: 4 },
    ],
    badges: ['stamina', 'exhaust', 'self_damage'],
    battleUseLimit: 0,
  },
  深夜便: {
    name: '深夜便+',
    description: '全アタック+2ダメージ',
    effects: [{ type: 'attack_damage_all_attacks', value: 2 }],
  },
  モバイルバッテリー: {
    name: 'モバイルバッテリー+',
    timeCost: 1.5,
    description: 'ターン開始時スタミナ+1。3回発動後に除外（所要時間1.5秒）',
    effects: [{ type: 'stamina_recover_per_turn', value: 1 }],
    powerTurnsRemaining: 3,
  },
  ラストワンマイル: {
    name: 'ラストワンマイル+',
    damage: 15,
    description: '15ダメージ。スタミナ3以下なら追加20ダメージ',
    effects: [{ type: 'stamina_low_damage_bonus', value: 20, threshold: 3 }],
  },
  配達完了ラッシュ: {
    name: '配達完了ラッシュ+',
    damage: 5,
    description: 'ランダムな敵に5ダメージ×5。スタミナ-4',
    effects: [
      { type: 'hit_count', value: 5 },
      { type: 'stamina_consume', value: 4 },
    ],
  },
  限界シフト: {
    name: '限界シフト+',
    description: 'このターン、アタックの所要時間-1秒。自分に4ダメージ',
    effects: [
      { type: 'turn_attack_time_discount', value: 1 },
      { type: 'self_damage', value: 4 },
    ],
  },
  過労ハイ: {
    name: '過労ハイ+',
    description: '過労ダウン中のみ使用可。全アタック+3ダメージ',
    effects: [{ type: 'attack_damage_all_attacks', value: 3 }],
  },
  代引き回収: {
    name: '代引き回収+',
    description: '3ターン置きにメンタル3回復',
    effects: [{ type: 'mental_recover_every_n_turns', value: 3, count: 3 }],
  },
  神ルート: {
    name: '神ルート+',
    description: 'カード3枚ドロー。スタミナ-2。このターン使用するスキルは1枚までコスト無料',
    effects: [
      { type: 'draw', value: 3 },
      { type: 'stamina_consume', value: 2 },
      { type: 'turn_skill_free_count', value: 1 },
    ],
  },
  置き配マスター: {
    name: '置き配マスター+',
    description: 'スタミナが8以上の時使用可能。全アタック+2ダメージ',
    effects: [{ type: 'attack_damage_all_attacks', value: 2 }],
  },
  夜明けの配達: {
    name: '夜明けの配達+',
    description: 'スタミナ+4。メンタル+3。使用後除外',
    effects: [
      { type: 'stamina_recover', value: 4 },
      { type: 'mental_boost', value: 3 },
    ],
  },
};
