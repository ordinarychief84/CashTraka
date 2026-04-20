'use client';

import { useState } from 'react';
import { Users2, Shield } from 'lucide-react';
import { RolesTab } from './RolesTab';

type Tab = 'members' | 'roles';

const TABS: { id: Tab; label: string; icon: typeof Users2 }[] = [
  { id: 'members', label: 'Members', icon: Users2 },
  { id: 'roles', label: 'Roles', icon: Shield },
];

type Props = {
  membersContent: React.ReactNode;
};

export function TeamPageClient({ membersContent }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('members');

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-slate-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-slate-700')
              }
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'members' && membersContent}
      {activeTab === 'roles' && <RolesTab />}
    </div>
  );
}
