@echo off
echo.
echo ========================================
echo   CashTraka - Push to GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Setting up Git identity...
git config user.email "s.chukwue@gmail.com"
git config user.name "Emeka"

echo.
echo [2/5] Pulling latest from GitHub...
git pull origin main --no-rebase
if %ERRORLEVEL% neq 0 (
    echo.
    echo Trying pull with rebase...
    git pull origin main --rebase
)

echo.
echo [3/5] Adding all changes...
git add -A

echo.
echo [4/5] Committing changes...
git commit -m "feat: full admin panel rebuild - settings, roles, support, refunds, notifications, audit log"
if %ERRORLEVEL% neq 0 (
    echo.
    echo NOTE: Nothing new to commit, or commit failed.
    echo Continuing to push...
)

echo.
echo [5/5] Pushing to GitHub...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Push failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   PUSH COMPLETE!
echo ========================================
echo.
echo All your code is now on GitHub.
echo Visit: https://github.com/ordinarychief84/CashTraka
echo.
pause
