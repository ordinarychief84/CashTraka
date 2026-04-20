@echo off
echo === CashTraka User Management + Audit Deploy ===
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
git commit -m "feat: redesign user management, add delete user, fix file encoding

- Admin Users: redesigned list page with 6 stat cards, improved filters and table
- Admin User Detail: redesigned with profile header, metric cards, subscription info
- Delete User: new modal with DELETE confirmation, audit logging, cascading deletes
- admin.service: added deleteUser() and userStats() methods
- API: added DELETE /api/admin/users/[id] endpoint
- Fixed backslash-exclamation encoding in multiple files
- Fixed null bytes and truncated content in PayLink, Receipt, Invoice pages"

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
echo No SQL migration needed for this deploy.
echo.
pause
