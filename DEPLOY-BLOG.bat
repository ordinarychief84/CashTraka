@echo off
echo === CashTraka Blog + Settings + RBAC Deployment ===
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
git commit -m "feat: blog, settings, RBAC, PayLink fixes, business name on receipts

- Blog: admin CRUD, public listing + post pages, footer nav
- Settings: tabbed sidebar (Profile, Account, Billing, Appearance, Danger Zone)
- RBAC: AdminStaff model, 6 roles, email invite flow, role-filtered navigation
- PayLink: fix unique constraint bug with retry on linkNumber collision
- PayLink: add optional Business Name field to creation form
- Receipts/Invoices: show business name as seller instead of generic Seller
- Prisma: added BlogPost + AdminStaff models
- Cron: fixed run-reminders schedule for Vercel Hobby plan"

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
echo IMPORTANT: Run admin_staff_rbac.sql in Neon SQL Editor before testing RBAC features.
echo File location: prisma\migrations\admin_staff_rbac.sql
echo.
pause
