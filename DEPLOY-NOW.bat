@echo off
echo ============================================
echo   CashTraka — Deploy to Production
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Pulling latest from GitHub...
git pull origin main --no-rebase
echo.

echo [2/5] Checking git status...
git status --short
echo.

echo [3/5] Staging all changes...
git add -A
echo.

echo [4/5] Committing changes...
git commit -m "feat: add pricing page with plan tiers, comparison table, and FAQ"
if %ERRORLEVEL% NEQ 0 (
    echo No new changes to commit, pushing existing commits...
)
echo.

echo [5/5] Pushing to origin/main...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PUSH FAILED. Make sure you're logged into GitHub.
    echo Try running: git config credential.helper manager
    echo Then run this