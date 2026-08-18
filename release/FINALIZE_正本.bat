@echo off
chcp 65001 >nul
setlocal
set "SRC=14b01a93-de5d-4c95-a655-932d2f3f2513.html"
set "OUT=みかみ塾英語問題アプリ_正本修正版_20260818.html"
if not exist "%SRC%" (
  echo [ERROR] %SRC% がこのフォルダにありません。
  echo 正本HTMLをこのフォルダへ入れてから、もう一度実行してください。
  pause
  exit /b 2
)
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js が見つかりません。
  pause
  exit /b 3
)
node tools\run_mikami_pipeline_v3.mjs "%SRC%" "%OUT%"
if errorlevel 1 (
  echo [ERROR] 修正パイプラインが停止しました。出力HTMLは採用しないでください。
  pause
  exit /b 4
)
echo.
echo [OK] %OUT%
echo 監査: %OUT%.pipeline-v3.audit.json
pause
