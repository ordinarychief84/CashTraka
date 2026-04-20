@echo off
echo === CashTraka Audit Fix Plan Deploy ===
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
git commit -m "feat: audit fix plan (P1-P3) + end-to-end brand color system

P1 fixes:
- Wire email channel in auto follow-up reminder cron
- Add customer notes/tags to schema + PATCH API + CustomerNote model
- Offline local queue via service worker IndexedDB
- Paystack refund integration in admin refund flow

P2 fixes:
- Budget enforcement with threshold warnings in expense creation
- Notification auto-triggers (suspend, reactivate, tickets, payments)
- Audit log middleware via notification service
- Suggestion proactive delivery in Daily Pulse email
- Industry preset expansion (seller vs landlord expense categories)

P3 fixes:
- Blog SEO: OpenGraph + Twitter Card metadata on post pages
- Fixed truncated files and encoding issues across 11 source files

Brand color consistency:
- 444+ Tailwind class replacements across 56 source files
- green/emerald/lime -> success-*, blue/cyan/teal -> brand-*, amber/yellow -> owed-*
- Inline hex colors in email templates aligned to brand palette
- Docs page link color updated to brand-600"

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
echo NOTE: Run SQL migration on Neon for CustomerNote model + Customer notes/tags + BlogPost SEO fields.
echo.
pause
