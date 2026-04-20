@echo off
echo ============================================
echo   CashTraka Deploy - Custom Roles Feature
echo ============================================
echo.

cd /d "%~dp0"

echo Removing git lock files...
del /f /q .git\index.lock 2>nul
del /f /q .git\HEAD.lock 2>nul

echo [1/3] Staging all changes...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo [2/3] Committing...
git commit -m "feat: custom roles system - create roles, assign to team members"
if errorlevel 1 (
    echo ERROR: git commit failed (maybe no changes?)
    pause
    exit /b 1
)

echo [3/3] Pushing to GitHub (triggers Vercel deploy)...
git push origin main
if errorlevel 1 (
    echo ERROR: git push failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS! Pushed to GitHub.
echo   Vercel will auto-deploy in ~60 seconds.
echo ============================================
echo.
pause
