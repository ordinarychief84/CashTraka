@echo off
echo.
echo ========================================
echo   CashTraka - Fix Lock + Push Schema
echo ========================================
echo.

cd /d "%~dp0"

echo Removing stale git lock file...
del /f /q ".git\index.lock" 2>nul
echo Done.

echo.
echo Setting up Git identity...
git config user.email "s.chukwue@gmail.com"
git config user.name "Emeka"

echo.
echo Adding all changes...
git add -A

echo.
echo Current status:
git status --short

echo.
echo Committing...
git commit -m "fix: restore truncated prisma schema (AdminStaff + PromiseToPay + InstallmentPlan models)"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
pause
