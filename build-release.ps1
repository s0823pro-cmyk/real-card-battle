# Real Card Battle - リリースAPKビルド & 実機インストールスクリプト
Set-Location "C:\dev\real-card-battle"

Write-Host "1/4 Webビルド中..." -ForegroundColor Cyan
npm run build

Write-Host "2/4 Capacitor同期中..." -ForegroundColor Cyan
npx cap sync

Write-Host "3/4 リリースAPKビルド中..." -ForegroundColor Cyan
Set-Location "C:\dev\real-card-battle\android"
.\gradlew assembleRelease `
  "-Pandroid.injected.signing.store.file=C:/dev/real-card-battle/keystore.jks" `
  "-Pandroid.injected.signing.store.password=password123" `
  "-Pandroid.injected.signing.key.alias=key0" `
  "-Pandroid.injected.signing.key.password=password123"

Write-Host "4/4 スマホにインストール中..." -ForegroundColor Cyan
adb uninstall com.s0823pro.realcardbattle
adb install "C:\dev\real-card-battle\android\app\build\outputs\apk\release\app-release.apk"

Write-Host "完了！スマホでアプリを確認してください" -ForegroundColor Green
Set-Location "C:\dev\real-card-battle"
