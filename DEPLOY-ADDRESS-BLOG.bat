@echo off
echo === CashTraka: Business Address + PayLink Fix + Blog Post Deploy ===
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
git commit -m "feat: business address in settings + PayLink fix + blog post seed

Business address:
- Add businessAddress field to Settings > Profile tab
- Wire through validator, API route, and settings page
- Show address on PayLink payment page under business name
- Already shown on PDF receipts and invoices

PayLink fix:
- Fix linkNumber collision: query globally instead of per-user
- nextLinkNumber now finds true global max across all users

Blog:
- Seed SQL for first blog post: 5 Strategies to Collect Debts Faster
- Researched and written for Nigerian small business audience"

if errorlevel 1 (
    echo [ERROR] git commit failed (maybe no changes?)
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
echo NEXT STEP: Run seed-blog-post.sql in Neon SQL Editor to publish the blog post.
echo.
pause
