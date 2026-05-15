import Link from 'next/link';
import { Plus, Download, Wallet } from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { TeamHeroKpis } from '@/components/team-dashboard/TeamHeroKpis';
import { TeamChartRow } from '@/components/team-dashboard/TeamChartRow';
import {
  TeamMembersTable,
  type TeamMemberRow,
} from '@/components/team-dashboard/TeamMembersTable';
import { TeamRightRail } from '@/components/team-dashboard/TeamRightRail';

export const dynamic = 'force-dynamic';

export default async function TeamDashboardPage() {
  const user = await guardWithPermission('team.read');

  const staff = await prisma.staffMember.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      customRole: { select: { name: true } },
    },
  });

  const rows: TeamMemberRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    department: s.customRole?.name ?? s.role,
    status: s.status === 'active' ? 'ACTIVE' : 'INACTIVE',
    joinedOn: s.createdAt.toISOString(),
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage team members, roles, permissions, and performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/team/manage" className="btn-pill-ghost">
            <Wallet size={14} />
            Payroll
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <Download size={14} />
            Team Report
          </Link>
          <Link href="/team/new" className="btn-pill-primary">
            <Plus size={14} />
            Add Team Member
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <TeamHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <TeamChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <TeamMembersTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <TeamRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
