import { Box } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';

export const dynamic = 'force-dynamic';

// Stock count drafts — mobile-app-initiated counting sessions.
// No web-create flow; counts are started from the mobile app.
// This page lists in-progress and completed drafts once the model is wired.

export default async function StockCountDraftsPage() {
  const user = await guard();

  // Placeholder — stock count draft DB model ships in a future sprint.
  const draftCount = 0;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-ink">
              {draftCount} Stock count drafts
            </h1>
          </div>

          {/* Empty state card */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-24 px-6 text-center">
            <Box
              size={56}
              strokeWidth={1.2}
              className="mb-5 text-slate-300"
            />
            <p className="max-w-xs text-[15px] text-slate-500">
              No drafts found. Create a new stock count using the mobile app.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
