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
git commit -m "feat: blog, settings rebuild, admin RBAC with staff invite flow

- Blog: admin CRUD, public listing + post pages, footer nav
- Settings: tabbed sidebar (Profile, Account, Billing, Appearance, Danger Zone)
- RBAC: AdminStaff model with 6 roles (Super Admin, Blog Manager, Billing Manager, Support Agent, Property Manager, Reports Viewer)
- RBAC: email invite flow — admin sends invite, staff sets password, logs in with role-restricted access
- RBAC: role-filtered AdminShell navigation — each role sees only their allowed sections
- RBAC: admin-rbac.ts permission matrix, admin-auth.ts helpers, requireAdminSection() guard
- RBAC: StaffManager UI with invite modal, role/status management, permissions reference
- Login: extended to detect admin_staff and redirect to /admin/dashboard
- All 11 admin pages updated to use role-based access control
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
