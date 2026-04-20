@echo off
echo === CashTraka Blog + Settings + Cron Fix Deployment ===
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
git commit -m "feat: add blog feature, settings rebuild, cron fix

- Blog: admin management (CRUD), public listing + individual post pages
- Blog: added to footer nav and admin sidebar
- Settings: rebuilt with tabbed sidebar (Profile, Account, Billing, Appearance, Danger Zone)
- Settings: new API routes for email change, password reset, account deletion
- Cron: fixed run-reminders schedule for Vercel Hobby plan (daily only)
- Prisma: added BlogPost model with indexes
- Fixed all build errors and null byte corruption"

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
echo === Blog migration SQL already executed on Neon — no further action needed. ===
echo.
pause
