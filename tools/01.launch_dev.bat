@echo off
title Spelling Tutor - Dev Server
cd /d "%~dp0.."

set "ASTRO_DIR=%~dp0..\..\Astro Project\jerome-portfolio"

echo ===================================================
echo  Spelling Tutor -- Launching Local Dev Environment
echo  Everything is served from ONE port:
echo    Landing page : http://localhost:4321/spelling/
echo    App          : http://localhost:4321/spelling/app/
echo  (Vite runs behind it on :5173; Astro forwards to it.
echo   Note: /admin/ai-credits also needs the Flashy Cards
echo   worker, which this script does NOT start -- test
echo   that page on prod instead.)
echo ===================================================
echo.

if not exist "%ASTRO_DIR%\package.json" (
    echo ERROR: Astro project not found at:
    echo   %ASTRO_DIR%
    pause
    exit /b 1
)

echo [1/2] Starting Astro site on :4321 (new window)...
start "Astro Dev (4321)" /d "%ASTRO_DIR%" cmd /k "npx astro dev"

echo [2/2] Starting Vite app on :5173 (this window)...
echo Opening http://localhost:4321/spelling/ shortly...
start "" /min cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:4321/spelling/"
echo.
call npm run dev
pause
