# MacBook から Android リリースビルド（AAB）を生成する

Capacitor プロジェクトの **Web 資産をビルド**し、**Android Gradle** で `bundleRelease` を実行して AAB を出力します。

## 1. キーストアの場所（確認結果）

- **リポジトリ内には `keystore.jks` は含まれません**（署名ファイルは各マシン・秘密管理用に別保管）。
- 以前の Windows 環境では `android/local.properties` の例として  
  `C:\dev\real-card-battle\keystore.jks` が使われていました（`android/local.properties.example` のコメント由来）。
- **Mac では** 例として次のいずれかに置き、`release.storeFile` に **絶対パス**で指定すると確実です。
  - リポジトリ直下: `.../real-card-battle/keystore.jks`
  - ホーム配下など: `~/Documents/keystore/real-card-battle.jks`

エイリアスは **`key0`**。ストア／キーのパスワードは **`android/local.properties` にのみ記載**し、Git にコミットしないでください（`android/` は `.gitignore` 対象ですが、誤コミット防止のためパスワードはドキュメント本文に書かない運用を推奨します）。

## 2. Mac で Gradle + Android SDK が使えるか

次を満たす必要があります。

| 要件 | 確認方法 |
|------|----------|
| **JDK 17**（AGP 8 系でよく使われる） | `java -version` |
| **Android SDK** | Android Studio インストール後、`~/Library/Android/sdk` などに SDK が存在する |
| **`sdk.dir` in `android/local.properties`** | `npx cap sync android` 後に Android Studio で一度プロジェクトを開くと自動追記されることが多い |

Gradle Wrapper（`android/gradlew`）は **`npx cap sync android` 後**の完全な `android/` ツリーに含まれます。リポジトリだけ clone した直後で `android/` が空／欠損の場合は、ルートで `npm install` のあと `npx cap add android` または `npx cap sync android` を実行してください。

## 3. `android/local.properties` の設定例

`android/local.properties` を作成（または追記）します。`config/android-local.properties.example` を参考にし、次を必ず設定します。

- `sdk.dir` … Android SDK の絶対パス（例: `/Users/あなたの名前/Library/Android/sdk`）
- `release.storeFile` … `keystore.jks` の絶対パス
- `release.storePassword` … キーストアのパスワード
- `release.keyAlias` … `key0`
- `release.keyPassword` … キー用パスワード（ストアと同じ場合も多い）

`android/app/build.gradle` は `rootProject.file('local.properties')`（= `android/local.properties`）から上記を読みます。

## 4. ビルド手順（手動）

リポジトリルートで:

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

成果物の目安:

- `android/app/build/outputs/bundle/release/app-release.aab`

## 5. スクリプトで一括実行

ルートから:

```bash
chmod +x scripts/build-android-aab.sh   # 初回のみ
./scripts/build-android-aab.sh
```

または:

```bash
npm run android:aab
```

事前に `android/local.properties` と `keystore.jks` の配置を済ませてください。スクリプトは `gradlew` や `local.properties` の存在をチェックします。

## 6. トラブルシュート

- **`gradlew: No such file`** … `npx cap sync android` で `android/` を再生成。
- **SDK が見つからない** … `sdk.dir` を `local.properties` に追記。
- **署名エラー** … `release.storeFile` が `android/app` から見た相対パスだと解釈がずれることがあるため、**絶対パス**を推奨。
