@echo off
title Spelling Tutor - Architecture Review
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\arch_review.ps1"
pause
