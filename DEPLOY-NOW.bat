@echo off
echo ============================================
echo   CashTraka — Push to GitHub
echo ============================================
echo.

cd /d "%~dp0"

echo Checking git status...
git status --short
echo.

echo Pushing to origin/main...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PUSH FAILED. Make sure you're logged into GitHub.
    echo Try: git config credential.helper manager
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS\\! Code pushed to GitHub.
echo   Vercel will auto-deploy in ~60 seconds.
echo   Check: https://vercel.com/dashboard
echo ============================================
echo.
pause
