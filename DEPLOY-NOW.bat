@echo off
echo ============================================
echo   CashTraka Deploy - Fix Truncated Files
echo ============================================

cd /d "%~dp0"

echo Removing git lock files...
del /f /q .git\index.lock 2>nul
del /f /q .git\HEAD.lock 2>nul

echo Staging all changes...
git add -A

echo Committing...
git commit -m "fix: repair truncated files (prisma schema, AuthForm, ExpenseSearchBar, AppShell, expense service)"

echo Pushing to GitHub...
git push origin main

echo ============================================
echo   DONE\! Vercel will auto-deploy.
echo ============================================
pause
