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
git commit -m "feat: Expenses module, OTP verification, email triggers, bug fixes"
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
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS! Code pushed to GitHub.
echo   Vercel will auto-deploy in ~60 seconds.
echo   Check: https://vercel.com/dashboard
echo ============================================
echo.
pause
