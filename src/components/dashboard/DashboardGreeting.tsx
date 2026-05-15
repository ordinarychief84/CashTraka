/**
 * Dashboard greeting strip — "Good morning, [Name] 👋" + subtitle.
 * Auto-picks morning/afternoon/evening from the local clock so the same
 * server-rendered string feels personal.
 */

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardGreeting({
  firstName,
  subtitle = "Here's what's happening with your business today.",
}: {
  firstName: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
        {greetingFor()}, {firstName} <span className="inline-block">👋</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
