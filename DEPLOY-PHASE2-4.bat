@echo off
echo ═══════════════════════════════════════════════════════════════
echo   CashTraka Phase 2-4 Deployment
echo   Auto Follow-Up, Behavior Tracking, Collection Score
echo ═══════════════════════════════════════════════════════════════
echo.

echo [Step 1] Removing stale git lock if present...
del /f ".git\index.lock" 2>nul

echo [Step 2] Generating Prisma client...
call npx prisma generate

echo [Step 3] Staging all changes...
git add -A

echo [Step 4] Committing...
git commit -m "feat: Phase 2-4 — Auto Follow-Up, Behavior Tracking, Collection Score

Phase 2 — Automation & Speed:
- Auto follow-up reminders with tone escalation (gentle → firm → final)
- ReminderRule and ReminderLog models with cron job (/api/cron/run-reminders)
- WhatsApp deep-link integration for payment reminders
- Feature-gated: autoReminders, maxReminderRules per plan tier

Phase 3 — Monetization Layer:
- 5 new feature flags in plan-limits.ts (autoReminders, maxReminderRules,
  behaviorTracking, collectionScore, suggestions)
- Free tier: limited (2 rules, no tracking); Business+: full access
- Upgrade prompts on dashboard for locked features

Phase 4 — Network Effects:
- Customer behavior tagging (FAST_PAYER, LATE_PAYER, DORMANT, HIGH_VALUE, NEW)
- Collection Score (0-100 weighted: on-time 40%%, speed 30%%, ratio 20%%, reminders 10%%)
- Smart Suggestions engine (COLLECT, REWARD, RE_ENGAGE, OPTIMISE)
- Dashboard widgets: CollectionScoreWidget, SuggestionsPanel
- Enhanced Collections page with score banner and behavior breakdown

New files: 6 services, 10+ API routes, 2 dashboard widgets, SQL migration
Modified: schema.prisma, plan-limits.ts, collections page, dashboard page"

echo [Step 5] Pushing to GitHub...
git push origin main

echo.
echo ═══════════════════════════════════════════════════════════════
echo   IMPORTANT: Run SQL Migration in Neon SQL Editor
echo ═══════════════════════════════════════════════════════════════
echo.
echo   1. Go to https://console.neon.tech
echo   2. Open your CashTraka database SQL Editor
echo   3. Copy and paste the contents of:
echo      prisma\migrations\phase2_4_migration.sql
echo   4. Click Run
echo   5. After SQL runs, redeploy on Vercel (or it auto-deploys)
echo.
echo   Optional: Add these cron jobs to Vercel:
echo   - /api/cron/run-reminders  (every 6 hours)
echo   - /api/cron/compute-scores (daily at 2am)
echo.
echo ═══════════════════════════════════════════════════════════════
pause
