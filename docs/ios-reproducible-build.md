# iOS別環境再現手順

JOBLESSを別Macでも同じ手順でビルドできるようにするための手順です。

## 管理方針

Gitで管理するもの:

- React / TypeScript ソース
- Capacitor設定
- iOS Xcodeプロジェクト本体
  - `ios/App/App.xcodeproj/project.pbxproj`
  - `ios/App/App/AppDelegate.swift`
  - `ios/App/App/Info.plist`
  - `ios/App/App/Assets.xcassets/`
  - `ios/App/CapApp-SPM/Package.swift`
  - Swift Package の `Package.resolved`

Gitで管理しないもの:

- `node_modules/`
- `dist/`
- `build/`
- `ios/App/App/public/`
- `ios/App/App/capacitor.config.json`
- `ios/App/App/config*.xml`
- `ios/App/Pods/`
- `ios/DerivedData*/`
- Xcodeの個人設定、`.xcuserstate`
- `.env*`
- Android署名キー

理由:

- `ios/App/App/public/` は `npm run build && npx cap sync ios` で毎回再生成できるため、Gitに入れない。
- Xcodeプロジェクト本体は署名設定・Bundle ID・Info.plist・アイコンを保持するため、Gitに入れる。
- CocoaPods系ファイルは現状のビルドでは使っていない。Capacitor 8 / SwiftPM構成を正とする。

## 必要環境

現在確認済みの環境:

```bash
node -v   # v24.14.0
npm -v    # 11.9.0
xcodebuild -version  # Xcode 26.5 / Build version 17F42
```

Nodeは `.nvmrc` に固定しています。

## 初回セットアップ

```bash
cd /path/to/real-card-battle
nvm use
npm ci
```

## Web + iOS同期

```bash
npm run ios:sync
```

内部で以下を実行します。

```bash
npm run build
npx cap sync ios
```

## 実機Debugビルド

まず端末IDを確認します。

```bash
xcodebuild -showdestinations -project ios/App/App.xcodeproj -scheme App
```

例:

```bash
IOS_XCODE_DEVICE_ID=00008150-000D794E26C0401C npm run ios:build:device
```

出力先:

```text
build/ios-device/Build/Products/Debug-iphoneos/App.app
```

## 実機インストール

`devicectl` 用の端末IDを確認します。

```bash
xcrun devicectl list devices
```

例:

```bash
IOS_DEVICECTL_ID=BA970474-E727-5440-857F-1DE25E649A27 npm run ios:install:device
```

## 本番配信ビルドについて

App Store提出用のArchiveは、Debug実機ビルドとは別にRelease Archiveで行います。
署名・App Store Connectアップロードは、対象バージョンのリリース作業時に個別実行してください。

## 別環境で壊れやすいポイント

- XcodeのApple IDログイン状態
- 証明書 / Provisioning Profile
- iPhone側の信頼設定、パスコードロック状態
- `.env` 系のローカル設定
- Cloudflare / Wrangler のログイン状態
- App Store Connect APIキー

これらはGit管理しません。各Macで個別に設定します。
