import { notFound, redirect } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ChecklistRunner } from '@/components/ChecklistRunner';

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string };
  searchParams: { runId?: string };
};

export default async function ChecklistRunPage({ params, searchParams }: Props) {
  const user = await guard();
  if (user.businessType === 'property_manager') redirect('/dashboard');

  const checklist = await prisma.checklist.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!checklist) notFound();

  // If no runId in query, start a new run
  let runId = searchParams.runId;
  if (!runId) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/checklists/${params.id}/run`,
      { method: 'POST', headers: { cookie: '' } },
    );
    // Fallback: create directly
    const items = await prisma.checklistItem.findMany({
      where: { checklistId: params.id },
      orderBy: { sortOrder: 'asc' },
    });
    const run = await prisma.checklistRun.create({
      data: {
        userId: user.id,
        checklistId: params.id,
        results: {
          create: items.map((it) => ({ itemId: it.id, checked: false })),
        },
      },
    });
    redirect(`/checklists/${params.id}/run?runId=${run.id}`);
  }

  const run = await prisma.checklistRun.findFirst({
    where: { id: runId, userId: user.id },
    include: {
      results: {
        include: { item: true },
        orderBy: { item: { sortOrder: 'asc' } },
      },
    },
  });
  if (!run) notFound();

  const items = run.results.map((r) => ({
    resultId: r.id,
    itemId: r.itemId,
    label: r.item.label,
    checked: r.checked,
    note: r.note,
  }));

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title={checklist.name} subtitle="Tap each item as you complete it." backHref="/checklists" />
      <div className="card p-5">
        <ChecklistRunner
          runId={run.id}
          checklistName={checklist.name}
          items={items}
        />
      </div>
    </AppShell>
  );
}
