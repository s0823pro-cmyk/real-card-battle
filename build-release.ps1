# Real Card Battle - リリースAABビルドスクリプト
Set-Location "C:\dev\real-card-battle"

# 1. Webビルド
Write-Host "1/3 Webビルド中..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Webビルド失敗" -ForegroundColor Red; exit 1 }

# 2. Capacitor同期
Write-Host "2/3 Capacitor同期中..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "cap sync失敗" -ForegroundColor Red; exit 1 }

# 3. versionCode を自動インクリメント
$gradlePath = "android\app\build.gradle"
$content = Get-Content $gradlePath -Raw
if ($content -match 'versionCode\s+(\d+)') {
    $currentVersion = [int]$Matches[1]
    $newVersion = $currentVersion + 1
    $content = $content -replace "versionCode\s+$currentVersion", "versionCode $newVersion"
    [System.IO.File]::WriteAllText((Resolve-Path $gradlePath), $content)
    Write-Host "versionCode: $currentVersion → $newVersion" -ForegroundColor Yellow
}

# 4. AABビルド
Write-Host "3/3 AABビルド中..." -ForegroundColor Cyan
Set-Location "android"
.\gradlew bundleRelease
$result = $LASTEXITCODE
Set-Location ".."

if ($result -eq 0) {
    Write-Host "完了！AABはこちら:" -ForegroundColor Green
    Write-Host "android\app\build\outputs\bundle\release\app-release.aab"
} else {
    Write-Host "AABビルド失敗" -ForegroundColor Red
    exit 1
}
