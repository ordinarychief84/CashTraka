@echo off
echo.
echo ========================================
echo   CashTraka - Deploying to Vercel
echo ========================================
echo.
echo This will take 2-3 minutes. Please wait...
echo.

cd /d "%~dp0"

echo [1/2] Linking to Vercel project...
call npx --yes vercel link --project cashtraka --yes
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Could not link to Vercel project.
    pause
    exit /b 1
)

echo.
echo [2/2] Deploying to production...
echo Vercel will install dependencies and build on their servers.
echo.
call npx --yes vercel --prod --yes
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Deployment failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app is now live! Check the URL above.
echo.
pause
