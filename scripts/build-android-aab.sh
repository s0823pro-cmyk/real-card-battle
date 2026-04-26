#!/usr/bin/env bash
# Mac から Android App Bundle（AAB）をビルドする。
# 事前: JDK、Android SDK、keystore、android/local.properties（署名・sdk.dir）を用意。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> npm run build"
npm run build

if [[ ! -d android ]]; then
  echo "ERROR: android/ がありません。npx cap add android または npx cap sync android を先に実行してください。" >&2
  exit 1
fi

echo "==> npx cap sync android"
npx cap sync android

if [[ ! -f android/gradlew ]]; then
  echo "ERROR: android/gradlew がありません。Capacitor の android プロジェクトが不完全です。npx cap sync android を確認してください。" >&2
  exit 1
fi

LP="$ROOT/android/local.properties"
if [[ ! -f "$LP" ]]; then
  echo "ERROR: android/local.properties がありません。" >&2
  echo "  config/android-local.properties.example を参考に sdk.dir と release.* を設定してください。" >&2
  exit 1
fi

if ! grep -qE '^[[:space:]]*release\.storeFile[[:space:]]*=' "$LP"; then
  echo "ERROR: android/local.properties に release.storeFile がありません。" >&2
  exit 1
fi

if ! grep -qE '^[[:space:]]*release\.storePassword[[:space:]]*=' "$LP" || ! grep -qE '^[[:space:]]*release\.keyPassword[[:space:]]*=' "$LP"; then
  echo "ERROR: android/local.properties に release.storePassword / release.keyPassword がありません。" >&2
  exit 1
fi

chmod +x android/gradlew

# スペース入りconfig xmlを削除
find "$ROOT/android/app/src/main/res/xml" -name "config *.xml" -delete 2>/dev/null || true

echo "==> ./gradlew bundleRelease"
(cd android && ./gradlew --no-daemon bundleRelease)

AAB="android/app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$ROOT/$AAB" ]]; then
  echo "OK: $ROOT/$AAB"
else
  echo "WARN: 期待パスに AAB が見つかりません: $AAB（Gradle の出力ログを確認してください）" >&2
  exit 1
fi
