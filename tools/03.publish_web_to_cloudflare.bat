@echo off
title Spelling Tutor - Publish to Cloudflare Pages
cd /d "%~dp0.."
setlocal

echo ===================================================
echo  Spelling Tutor -- Publish Web to Cloudflare Pages
echo ===================================================
echo.

set CF_PAGES_PROJECT=spelling-tutor
set CF_ZONE_ID=dbada03c0822fadab4f40eac097098c4

:: Read CACHE_PURGE_TOKEN from environment, or prompt if missing
if "%CACHE_PURGE_TOKEN%"=="" (
    echo CACHE_PURGE_TOKEN not set in environment. Skipping automatic CDN purge.
)

echo [1/3] Building Vite production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Deploying to Cloudflare Pages project: %CF_PAGES_PROJECT%...
call npx wrangler pages deploy dist --project-name=%CF_PAGES_PROJECT% --branch=main --commit-dirty=true
if %errorlevel% neq 0 (
    echo [ERROR] Cloudflare Pages deploy failed!
    echo If this is the first deploy, create the project first:
    echo   npx wrangler pages project create %CF_PAGES_PROJECT%
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Purging Cloudflare CDN cache...
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/%CF_ZONE_ID%/purge_cache" ^
     -H "Authorization: Bearer %CACHE_PURGE_TOKEN%" ^
     -H "Content-Type: application/json" ^
     -d "{\"files\":[\"https://goodplusfast.com/spelling/app/\", \"https://www.goodplusfast.com/spelling/app/\"]}"

echo.
echo ===================================================
echo  Publish Complete!
echo  Pages Live: https://%CF_PAGES_PROJECT%.pages.dev/spelling/app/
echo  Main Site:  https://goodplusfast.com/spelling/app/
echo ===================================================
pause
