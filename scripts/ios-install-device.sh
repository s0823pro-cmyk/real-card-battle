#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${IOS_DEVICECTL_ID:-}" ]]; then
  echo "IOS_DEVICECTL_ID is required. Available devices:" >&2
  xcrun devicectl list devices >&2 || true
  echo "Example:" >&2
  echo "  IOS_DEVICECTL_ID=BA970474-E727-5440-857F-1DE25E649A27 npm run ios:install:device" >&2
  exit 2
fi

DERIVED_DATA_PATH="${IOS_DERIVED_DATA_PATH:-build/ios-device}"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos/App.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app was not found: $APP_PATH" >&2
  echo "Run npm run ios:build:device first." >&2
  exit 1
fi

xcrun devicectl device install app --device "$IOS_DEVICECTL_ID" "$APP_PATH"
