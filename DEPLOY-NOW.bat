@echo off
echo ============================================
echo   CashTraka — Deploy to Production
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] Checking git status...
git status --short
echo.

echo [2/4] Staging all changes...
git add -A
echo.

echo [3/4] Committing changes...
git commit -m "fix: remove backslash-escaped exclamation marks from 70 source files"
if %ERRORLEVEL% NEQ 0 (
    echo No new changes to commit, pushing existing commits...
)
echo.

echo [4/4] Pushing to origin/main...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PUSH FAILED. Make sure you're logged into GitHub.
    echo Try running: git config credential.helper manager
    echo Then run this