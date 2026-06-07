# JOBLESS Steam Launch Plan

## 方針

- 先にSteamストアページを公開し、ウィッシュリストを集める。
- ゲーム本体はスマホ版と同じReact/Vite実装を使い、Steam版はElectronで包む。
- ランキングAPIはスマホ版と同じ `https://jobless-ranking.word2cardapi0823.workers.dev` を使う。
- Steam版では広告、アプリ内課金、App Storeレビュー誘導を無効化する。
- 価格は買い切りを基本にし、広告削除やサポーターパックはSteam版では出さない。

## 最小ビルド

```bash
npm run steam:build
npm run steam:pack
```

- `steam:build`: `dist-steam` にSteam向けWebビルドを作る。
- `steam:pack`: `steam-dist` にElectron配布物を作る。

## ストアページ準備

- 短い説明: 無職から伝説へ進むローグライクカードバトル。
- ジャンル: ローグライク / カードバトル / デッキ構築 / シングルプレイヤー。
- 推しポイント: 職業ごとの独自ルール、ランキング、優勝者カード、世界樹のシーズン演出。
- スクリーンショット: タイトル、バトル、マップ、ランキング、図鑑、優勝者カード。
- トレーラー: 15〜30秒で「カード選択、敵撃破、ランキング、優勝者カード」を見せる。
- Steamworks用の暫定画像は `npm run steam:store-assets` で `docs/generated-assets/steam-store/` に生成する。
- 生成画像はページ先行公開用。最終販促前にカードバトル感が強い専用カプセルへ差し替える。

## 同時アップデート運用

- 共通ロジックは `src` に置く。
- プラットフォーム差分は `src/utils/platform.ts` に集約する。
- モバイル専用処理は `areAdsEnabled()` / `areInAppPurchasesEnabled()` / `isAppStoreReviewPromptEnabled()` で分岐する。
- ランキングやカードデータは共有し、Steam専用データを増やす場合は明確な理由がある時だけ追加する。
