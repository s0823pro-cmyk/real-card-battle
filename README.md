# JOBLESS / Real Card Battle

React + TypeScript + Vite + Capacitor のモバイル向けカードバトルゲームです。

iOSビルドを別Macでも再現できるように、Xcodeプロジェクト本体はGit管理し、同期済みweb assetsやDerivedDataなどの生成物はGit管理しません。

## 基本コマンド

```bash
npm ci
npm run lint
npm run build
```

## iOS再現手順

詳細は以下を参照してください。

- `docs/ios-reproducible-build.md`

主なコマンド:

```bash
npm run ios:sync
IOS_XCODE_DEVICE_ID=<Xcode destination id> npm run ios:build:device
IOS_DEVICECTL_ID=<devicectl device id> npm run ios:install:device
```

## ランキングWorker

```bash
cd ranking-server
npm run build
npm test -- --run
npm run deploy:safe
```

`deploy:safe` は build → test → remote D1 migration → Worker deploy の順で実行します。
