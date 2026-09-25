@echo off
title Spelling Tutor - Dev Server
cd /d "%~dp0.."
echo ===================================================
echo  Spelling Tutor -- Launching Local Dev Server
echo  URL: http://localhost:5173/spelling/app/
echo ===================================================
echo.
call npm run dev -- --open
pause
