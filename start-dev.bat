@echo off
cd /d "%~dp0"
echo TCGツールを起動しています...
echo 少し待つと、下に "Network:" という行でスマホ用のアドレスが出ます。
echo 終わるときはこのウィンドウを閉じるか、Ctrl+Cを押してください。
echo.
npm run dev
pause
