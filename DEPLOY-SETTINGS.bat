@echo off
echo ============================================
echo  CashTraka - Deploy Settings Rebuild
echo ============================================
echo.

cd /d "%~dp0"

:: Remove stale lock if present
if exist ".git\index.lock" (
    echo Removing stale git lock...
    del /f ".git\index.lock"
)

:: Stage all changes
echo Staging all changes...
git add -A

:: Commit
echo Committing...
git commit -m "feat: rebuild Settings page with tabbed sidebar layout"

:: Push
echo Pushing to GitHub...
git push origin main

echo.
echo ============================================
echo  Done! Vercel will auto-deploy.
echo ============================================
pause
