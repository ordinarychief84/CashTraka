import { Heart } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { FeedbackList } from '@/components/feedback/FeedbackList';
import { feedbackService } from '@/lib/services/feedback.service';

export const dynamic = 'force-dynamic';

/**
 * Internal Service Check page. Shows feedback metrics and a filterable list
 * of recent feedback rows.
 */
export default async function ServiceCheckPage() {
  const user = await guard();
  const metrics = await feedbackService.getFeedbackMetrics(user.id);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Service Check"
        subtitle="See how customers feel about their experience and follow up where it matters."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Feedback received"
          value={String(metrics.total)}
          sub={`${metrics.last30Days} in the last 30 days`}
        />
        <StatCard
          label="Positive"
          value={`${metrics.positivePct}%`}
          tone="brand"
          sub={`${metrics.positive} happy customers`}
        />
        <StatCard
          label="Negative"
          value={String(metrics.negative)}
          tone={metrics.negative > 0 ? 'danger' : 'neutral'}
          sub={`${metrics.negativePct}% of all responses`}
        />
        <StatCard
          label="Needs attention"
          value={String(metrics.unresolved)}
          tone={metrics.unresolved > 0 ? 'danger' : 'neutral'}
          sub="Unresolved negative feedback"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <Heart size={16} className="text-brand-600" />
          Recent feedback
        </h2>
        <FeedbackList />
      </div>
    </AppShell>
  );
}
