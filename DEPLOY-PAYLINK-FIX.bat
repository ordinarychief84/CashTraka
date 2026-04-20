@echo off
echo === CashTraka PayLink Fix Deploy ===
echo.

cd /d "%~dp0"

:: Remove any stale lock files
if exist .git\index.lock del /f .git\index.lock
if exist .git\HEAD.lock del /f .git\HEAD.lock

:: Stage all changes
git add -A
if errorlevel 1 (
    echo [ERROR] git add failed
    pause
    exit /b 1
)

:: Commit
git commit -m "fix: PayLink linkNumber collision — query globally instead of per-user

The nextLinkNumber function queried only the current user's records to
find the highest linkNumber, but linkNumber has a GLOBAL unique constraint.
When multiple users exist, this caused repeated P2002 unique constraint
violations that the retry logic could not recover from.

Fix: remove userId filter so the function finds the true global maximum."

if errorlevel 1 (
    echo [ERROR] git commit failed
    pause
    exit /b 1
)

:: Push
git push origin main
if errorlevel 1 (
    echo [ERROR] git push failed
    pause
    exit /b 1
)

echo.
echo === Push complete! Vercel will auto-deploy in ~60 seconds. ===
echo.
pause
