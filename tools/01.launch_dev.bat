@echo off
title Spelling Tutor - Dev Server (always logged in)
cd /d "%~dp0.."


echo ===================================================
echo  Spelling Tutor -- Launching Local Dev Environment
echo  You are ALWAYS LOGGED IN as a sample parent
echo  (mock API: sample lists, canned AI answers,
echo   nothing is saved; restart = fresh data).
echo  App : http://localhost:5173/spelling/app/
echo  For the real site + real login, use
echo  tools\07.launch_dev_real.bat
echo ===================================================
echo.

echo Opening http://localhost:5173/spelling/app/ shortly...
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:5173/spelling/app/"
echo.
call npm run dev:mock
pause
