# Android Studio を閉じた状態で実行してください。
# OneDrive の同期を一時停止してから実行すると成功率が上がります。
$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $projectRoot "android"

Write-Host "Project: $projectRoot"
Write-Host "Stopping Gradle daemon..."

Push-Location $androidDir
if (Test-Path ".\gradlew.bat") {
  & .\gradlew.bat --stop 2>$null
}
Pop-Location

Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$paths = @(
  (Join-Path $projectRoot "android\build"),
  (Join-Path $projectRoot "android\app\build"),
  (Join-Path $projectRoot "android\capacitor-cordova-android-plugins\build"),
  (Join-Path $projectRoot "node_modules\@capacitor\android\capacitor\build")
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $p) {
      Write-Host "FAILED to remove: $p" -ForegroundColor Yellow
    } else {
      Write-Host "Removed: $p" -ForegroundColor Green
    }
  }
}

Write-Host ""
Write-Host "Done. Android Studio を開き直して Rebuild してください。" -ForegroundColor Cyan
Write-Host "まだ AccessDenied になる場合: Windows Defender で real-card-battle フォルダを除外、またはプロジェクトを C:\dev などに移動。" -ForegroundColor Cyan
