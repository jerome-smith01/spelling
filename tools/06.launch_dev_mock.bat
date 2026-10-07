@echo off
title Spelling Tutor - Dev Server (mock API)
cd /d "%~dp0.."

echo ===================================================
echo  Spelling Tutor -- Layout testing with a MOCK API
echo  App : http://localhost:5173/spelling/app/
echo  You are logged in as a fake user; AI answers are
echo  canned. Nothing is saved (restart = fresh data).
echo ===================================================
echo.
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:5173/spelling/app/"
call npm run dev:mock
pause
