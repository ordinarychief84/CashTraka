@echo off
echo.
echo ========================================
echo   CashTraka - Push to GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Setting up Git identity...
git config user.email "s.chukwue@gmail.com"
git config user.name "Emeka"

echo.
echo [2/6] Pulling latest from GitHub...
git pull origin main --no-rebase
if %ERRORLEVEL% neq 0 (
    echo.
    echo Trying pull with rebase...
    git pull origin main --rebase
)

echo.
echo [3/6] Staging new feature files...

REM === New feature: PayLink ===
git add src/lib/services/paylink.service.ts
git add src/app/api/paylinks/route.ts
git add "src/app/api/paylinks/[id]/route.ts"
git add "src/app/api/pay/[token]/route.ts"
git add src/app/paylinks/page.tsx
git add src/app/paylinks/new/page.tsx
git add "src/app/pay/[token]/page.tsx"
git add src/components/paylinks/PayLinkActions.tsx
git add src/components/paylinks/CreatePayLinkForm.tsx
git add src/components/paylinks/PayPageClient.tsx

REM === New feature: Daily Pulse ===
git add src/lib/services/daily-pulse.service.ts
git add src/app/api/daily-pulse/route.ts
git add src/app/api/cron/daily-pulse/route.ts

REM === New feature: Smart Collection Engine ===
git add src/lib/services/collection.service.ts
git add src/app/api/collections/route.ts
git add src/app/collections/page.tsx
git add src/components/collections/CollectionActions.tsx

REM === Modified existing files ===
git add prisma/schema.prisma
git add src/components/AppShell.tsx
git add src/components/MoreSheet.tsx
git add src/lib/services/email.service.ts
git add src/app/dashboard/page.tsx
git add vercel.json
git add src/middleware.ts

REM === Marketing copy rewrite ===
git add src/app/page.tsx
git add src/app/about/page.tsx
git add src/app/layout.tsx
git add src/components/marketing/HeroSolutions.tsx
git add src/components/marketing/HeroICP.tsx
git add src/components/marketing/SolutionsPath.tsx

REM === This file ===
git add PUSH-TO-GITHUB.bat

echo.
echo [4/6] Checking staged changes...
git status --short

echo.
echo [5/6] Committing changes...
git commit -m "feat: PayLink, Daily Pulse, Smart Collection Engine + marketing copy rewrite"
if %ERRORLEVEL% neq 0 (
    echo.
    echo NOTE: Nothing new to commit, or commit failed.
    echo Continuing to push...
)

echo.
echo [6/6] Pushing to GitHub...
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
echo IMPORTANT: After push, run this in your terminal:
echo   npx prisma db push
echo (This creates the new PaymentRequest table in Neon)
echo.
pause
