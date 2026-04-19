@echo off
echo ============================================
echo   CashTraka — Deploy to Production
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Cleaning up lock files...
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
echo.

echo [2/5] Checking git status...
git status --short
echo.

echo [3/5] Staging all changes...
git add -A
echo.

echo [4/5] Committing changes...
git commit -m "feat: add delayed welcome email 30 min after signup + expense management redesign"
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
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS\! Changes pushed to GitHub.
echo   Vercel will auto-deploy from main branch.
echo ============================================
echo.
echo IMPORTANT: After deploy, run the Prisma migration:
echo   The new welcomeEmailSentAt field and expense fields
echo   will be applied automatically by Vercel's build.
echo.
pause
