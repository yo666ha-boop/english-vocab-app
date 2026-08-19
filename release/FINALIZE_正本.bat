@echo off
chcp 65001 >nul
setlocal
set "SRC=app_zero_vocab_gate_single_latest(10).html"
if not exist "%SRC%" set "SRC=14b01a93-de5d-4c95-a655-932d2f3f2513.html"
set "OUT=みかみ塾英語問題アプリ_正本修正版_V4_20260819.html"
if not exist "%SRC%" (
  echo [ERROR] 正本HTMLがこのフォルダにありません。
  echo app_zero_vocab_gate_single_latest(10).html をこのフォルダへ入れてから、もう一度実行してください。
  pause
  exit /b 2
)
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js が見つかりません。
  pause
  exit /b 3
)
node tools\run_mikami_pipeline_v4.mjs "%SRC%" "%OUT%"
if errorlevel 1 (
  echo [ERROR] V4修正パイプラインが停止しました。出力HTMLは採用しないでください。
  pause
  exit /b 4
)
echo.
echo [OK] %OUT%
echo 監査: %OUT%.pipeline-v4.audit.json
pause
