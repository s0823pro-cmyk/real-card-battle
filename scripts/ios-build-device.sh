#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${IOS_XCODE_DEVICE_ID:-}" ]]; then
  echo "IOS_XCODE_DEVICE_ID is required. Available destinations:" >&2
  xcodebuild -showdestinations -project ios/App/App.xcodeproj -scheme App >&2 || true
  echo "Example:" >&2
  echo "  IOS_XCODE_DEVICE_ID=00008150-000D794E26C0401C npm run ios:build:device" >&2
  exit 2
fi

DERIVED_DATA_PATH="${IOS_DERIVED_DATA_PATH:-build/ios-device}"

npm run ios:sync

xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "platform=iOS,id=${IOS_XCODE_DEVICE_ID}" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -allowProvisioningUpdates \
  build

APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos/App.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app was not found: $APP_PATH" >&2
  exit 1
fi

echo "Built app: $APP_PATH"
