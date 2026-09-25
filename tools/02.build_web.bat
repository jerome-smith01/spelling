@echo off
title Spelling Tutor - Build Web
cd /d "%~dp0.."
echo ===================================================
echo  Spelling Tutor -- Building Production Web (Vite)
echo ===================================================
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Vite build failed!
    pause
    exit /b %errorlevel%
)
echo.
echo [SUCCESS] Build output generated in dist\
pause
