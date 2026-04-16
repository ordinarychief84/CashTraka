import Link from 'next/link';
import { Plus, MinusCircle, MessageCircle } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link href="/payments/new" className="card p-3 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Plus size={20} />
        </div>
        <div className="text-xs font-semibold text-ink">Add Payment</div>
      </Link>
      <Link href="/debts/new" className="card p-3 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-owed-50 text-owed-600">
          <MinusCircle size={20} />
        </div>
        <div className="text-xs font-semibold text-ink">Add Debt</div>
      </Link>
      <Link href="/follow-up" className="card p-3 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
          <MessageCircle size={20} />
        </div>
        <div className="text-xs font-semibold text-ink">Follow-up</div>
      </Link>
    </div>
  );
}
