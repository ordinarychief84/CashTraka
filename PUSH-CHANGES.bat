@echo off
echo ========================================
echo   CashTraka - Push UI/UX Changes
echo ========================================
echo.

cd /d "%~dp0"

echo Adding all changes...
git add -A

echo.
echo Committing...
git commit -m "feat: UI/UX overhaul - tighten dashboard layout, consolidate CTAs, date range exports, active sidebar nav, simplify filters, complete icon migration"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   Done! Vercel will auto-deploy.
echo ========================================
pause
