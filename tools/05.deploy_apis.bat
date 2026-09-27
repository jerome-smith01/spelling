@echo off
title Spelling Tutor - Deploy Menu
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\deploy_apis.ps1"
if %errorlevel% neq 0 pause
