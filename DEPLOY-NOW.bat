@echo off
echo ============================================
echo   CashTraka - Push to GitHub + Deploy
echo ============================================
echo.

cd /d "%~dp0"

echo Adding all changes...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo.
echo Committing...
git commit -m "feat: OTP verification, terms checkbox, email triggers + PayLinks, Daily Pulse, Collections"
if errorlevel 1 (
    echo NOTE: Nothing new to commit. Pushing existing commits...
)

echo.
echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Push failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS\! Code pushed to GitHub.
echo   Vercel will auto-deploy in ~2 minutes.
echo ============================================
echo.
pause
