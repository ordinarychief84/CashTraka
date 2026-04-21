@echo off
echo.
echo ========================================
echo   CashTraka - Push ALL changes
echo ========================================
echo.

cd /d "%~dp0"

echo Setting up Git identity...
git config user.email "s.chukwue@gmail.com"
git config user.name "Emeka"

echo.
echo Pulling latest...
git pull origin main --no-rebase

echo.
echo Adding all changes...
git add -A

echo.
echo Current status:
git status --short

echo.
echo Committing (if any unstaged changes remain)...
git commit -m "fix: complete truncated service files (payment-provider, paystack-customer, webhook)"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   DONE\!
echo ========================================
echo.
pause
