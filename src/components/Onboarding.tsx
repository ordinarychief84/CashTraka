'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  MessageCircle,
  PartyPopper,
  Rocket,
  Banknote,
  Clock3,
  Building2,
  Users,
  Key,
} from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { DebtForm } from './DebtForm';
import { waLink, reminderMessage } from '@/lib/whatsapp';

type Debt = { id: string; customerName: string; phone: string; amountOwed: number };
type Property = { id: string; name: string };
type Tenant = { id: string; name: string; phone: string; rentAmount: number; propertyName?: string };

type Props = {
  initial: {
    payments: number;
    debts: number;
    latestDebt: Debt | null;
    properties?: number;
    tenants?: number;
    latestProperty?: Property | null;
    latestTenant?: Tenant | null;
  };
  firstName: string;
  businessType: string;
};

export function Onboarding({ initial, firstName, businessType }: Props) {
  const isPm = businessType === 'property_manager';
  return isPm ? (
    <PropertyManagerOnboarding initial={initial} firstName={firstName} />
  ) : (
    <SellerOnboarding initial={initial} firstName={firstName} />
  );
}

/* ─────────────────── SELLER PATH ─────────────────── */

function SellerOnboarding({ initial, firstName }: Omit<Props, 'businessType'>) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [reminderSent, setReminderSent] = useState(false);
  const [latestDebt, setLatestDebt] = useState<Debt | null>(initial.latestDebt);
  const [finishing, setFinishing] = useState(false);
  const totalSteps = 5;

  async function fetchState() {
    const res = await fetch('/api/onboarding/state', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.latestDebt) setLatestDebt(data.latestDebt);
    }
  }

  async function markDone() {
    setFinishing(true);
    await fetch('/api/onboarding', { method: 'POST' });
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Shell current={step} totalSteps={totalSteps} onSkip={markDone}>
      {step === 1 && (
        <StepCard
          icon={<Rocket className="text-brand-600" />}
          title={`Welcome${firstName ? `, ${firstName}` : ''}!`}
          description="CashTraka helps you track payments, log debts, and send WhatsApp reminders. Let's set up in 3 quick steps."
        >
          <button className="btn-primary w-full" onClick={() => setStep(2)}>Get started</button>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          icon={<Banknote className="text-brand-600" />}
          title="Add your first payment"
          description="Record a sale you recently received, cash or transfer. This builds your ledger."
        >
          <PaymentForm
            redirectTo="/onboarding"
            onSuccess={async () => {
              await fetchState();
              setStep(3);
            }}
          />
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          icon={<Clock3 className="text-owed-600" />}
          title="Add your first debt"
          description="Who owes you? Log them here so you can follow up later."
        >
          <DebtForm
            redirectTo="/onboarding"
            onSuccess={async () => {
              await fetchState();
              setStep(4);
            }}
          />
        </StepCard>
      )}

      {step === 4 && (
        <StepCard
          icon={<MessageCircle className="text-[#128C7E]" />}
          title="Send your first reminder"
          description="Tap the button below to open WhatsApp with a polite reminder ready to send."
        >
          {latestDebt ? (
            <>
              <div className="mb-4 rounded-lg border border-border bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold text-ink">{latestDebt.customerName}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Owes ₦{latestDebt.amountOwed.toLocaleString('en-NG')}
                </div>
              </div>
              <a
                href={waLink(latestDebt.phone, reminderMessage(latestDebt.customerName, latestDebt.amountOwed))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReminderSent(true)}
                className="btn-wa w-full"
              >
                <MessageCircle size={18} />
                Open in WhatsApp
              </a>
              <button onClick={() => setStep(5)} disabled={!reminderSent} className="btn-secondary mt-3 w-full">
                I've sent it, continue
              </button>
              {!reminderSent && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  Open WhatsApp first to unlock the next step.
                </p>
              )}
            </>
          ) : (
            <button onClick={() => setStep(3)} className="btn-secondary w-full">
              Go back and add a debt first
            </button>
          )}
        </StepCard>
      )}

      {step === 5 && (
        <DoneCard
          title="You're all set!"
          items={[
            'Payment saved',
            'Debt saved',
            'Customer created automatically',
            'Reminder sent',
          ]}
          onDone={markDone}
          finishing={finishing}
        />
      )}
    </Shell>
  );
}

/* ─────────────── PROPERTY MANAGER PATH ─────────────── */

function PropertyManagerOnboarding({ initial, firstName }: Omit<Props, 'businessType'>) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [property, setProperty] = useState<Property | null>(initial.latestProperty ?? null);
  const [tenant, setTenant] = useState<Tenant | null>(initial.latestTenant ?? null);
  const [reminderSent, setReminderSent] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const totalSteps = 5;

  async function markDone() {
    setFinishing(true);
    await fetch('/api/onboarding', { method: 'POST' });
    router.push('/dashboard');
    router.refresh();
  }

  async function fetchState() {
    const res = await fetch('/api/onboarding/state', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.latestProperty) setProperty(data.latestProperty);
      if (data.latestTenant) setTenant(data.latestTenant);
    }
  }

  return (
    <Shell current={step} totalSteps={totalSteps} onSkip={markDone}>
      {step === 1 && (
        <StepCard
          icon={<Rocket className="text-brand-600" />}
          title={`Welcome${firstName ? `, ${firstName}` : ''}!`}
          description="CashTraka helps you track rent, know who's behind, and send WhatsApp reminders. Let's set up in 3 quick steps."
        >
          <button className="btn-primary w-full" onClick={() => setStep(2)}>Get started</button>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          icon={<Building2 className="text-brand-600" />}
          title="Add your first property"
          description="A building, compound, or single unit. You'll add tenants to it in the next step."
        >
          <InlinePropertyForm
            onCreated={async (p) => {
              setProperty(p);
              await fetchState();
              setStep(3);
            }}
          />
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          icon={<Users className="text-brand-600" />}
          title="Add your first tenant"
          description={property ? `Who lives at ${property.name}?` : "Add a tenant to the property."}
        >
          {property ? (
            <InlineTenantForm
              propertyId={property.id}
              onCreated={async (t) => {
                setTenant({ ...t, propertyName: property.name });
                await fetchState();
                setStep(4);
              }}
            />
          ) : (
            <button onClick={() => setStep(2)} className="btn-secondary w-full">
              Go back and add a property first
            </button>
          )}
        </StepCard>
      )}

      {step === 4 && (
        <StepCard
          icon={<MessageCircle className="text-[#128C7E]" />}
          title="Send a rent reminder"
          description="Tap the button to open WhatsApp with a polite rent reminder ready to send."
        >
          {tenant ? (
            <>
              <div className="mb-4 rounded-lg border border-border bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold text-ink">{tenant.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {tenant.propertyName ? `${tenant.propertyName} · ` : ''}Rent: ₦{tenant.rentAmount.toLocaleString('en-NG')}
                </div>
              </div>
              <a
                href={waLink(
                  tenant.phone,
                  `Hi ${tenant.name}, this is a reminder about your rent${tenant.propertyName ? ` at ${tenant.propertyName}` : ''}. Kindly make payment of ₦${tenant.rentAmount.toLocaleString('en-NG')} at your earliest convenience. Thank you.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReminderSent(true)}
                className="btn-wa w-full"
              >
                <MessageCircle size={18} />
                Open in WhatsApp
              </a>
              <button onClick={() => setStep(5)} disabled={!reminderSent} className="btn-secondary mt-3 w-full">
                I've sent it, continue
              </button>
              {!reminderSent && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  Open WhatsApp first to unlock the next step.
                </p>
              )}
            </>
          ) : (
            <button onClick={() => setStep(3)} className="btn-secondary w-full">
              Go back and add a tenant first
            </button>
          )}
        </StepCard>
      )}

      {step === 5 && (
        <DoneCard
          title="You're all set!"
          items={[
            'Property added',
            'Tenant recorded',
            'Rent amount saved',
            'Reminder sent',
          ]}
          onDone={markDone}
          finishing={finishing}
        />
      )}
    </Shell>
  );
}

/* ─────────────────── Shared UI ─────────────────── */

function Shell({
  current,
  totalSteps,
  onSkip,
  children,
}: {
  current: number;
  totalSteps: number;
  onSkip: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            Step {Math.min(current, totalSteps)} of {totalSteps}
          </div>
          <button
            onClick={onSkip}
            className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
          >
            Skip setup
          </button>
        </div>
        <div className="mb-6 h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${(Math.min(current, totalSteps) / totalSteps) * 100}%` }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
        {icon}
      </div>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function DoneCard({
  title,
  items,
  onDone,
  finishing,
}: {
  title: string;
  items: string[];
  onDone: () => void;
  finishing: boolean;
}) {
  return (
    <StepCard
      icon={<PartyPopper className="text-brand-600" />}
      title={title}
      description="Your account is ready. Here's a quick recap:"
    >
      <ul className="mb-5 space-y-2 text-sm">
        {items.map((label) => (
          <li key={label} className="flex items-center gap-2 text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
              <Check size={12} />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <button onClick={onDone} disabled={finishing} className="btn-primary w-full">
        {finishing ? 'Loading…' : 'Go to dashboard'}
      </button>
      <Link href="/dashboard" className="mt-2 block text-center text-xs text-slate-500 underline">
        Or skip
      </Link>
    </StepCard>
  );
}

/* ─────────── Inline forms for PM onboarding ─────────── */

function InlinePropertyForm({
  onCreated,
}: {
  onCreated: (p: Property) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name') || ''),
      address: String(form.get('address') || ''),
      unitCount: Number(form.get('unitCount') || 1),
    };
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onCreated({ id: data.id, name: payload.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="label">Property name</label>
        <input id="name" name="name" className="input" required placeholder="e.g. Sunshine Apartments" />
      </div>
      <div>
        <label htmlFor="address" className="label">Address (optional)</label>
        <input id="address" name="address" className="input" placeholder="e.g. 12 Adeola Street, Lekki" />
      </div>
      <div>
        <label htmlFor="unitCount" className="label">Number of units</label>
        <input id="unitCount" name="unitCount" type="number" min={1} defaultValue={1} className="input" />
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : 'Save property'}
      </button>
    </form>
  );
}

function InlineTenantForm({
  propertyId,
  onCreated,
}: {
  propertyId: string;
  onCreated: (t: Tenant) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '');
    const phone = String(form.get('phone') || '');
    const rentAmount = Number(form.get('rentAmount') || 0);
    const payload = {
      propertyId,
      name,
      phone,
      rentAmount,
      rentDueDay: Number(form.get('rentDueDay') || 1),
      rentFrequency: 'monthly',
      unitLabel: String(form.get('unitLabel') || ''),
    };
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onCreated({ id: data.id, name, phone, rentAmount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="label">Tenant name</label>
        <input id="name" name="name" className="input" required placeholder="e.g. Chidi Okafor" />
      </div>
      <div>
        <label htmlFor="phone" className="label">Phone</label>
        <input id="phone" name="phone" className="input" inputMode="tel" required placeholder="08012345678" />
      </div>
      <div>
        <label htmlFor="unitLabel" className="label">Unit (optional)</label>
        <input id="unitLabel" name="unitLabel" className="input" placeholder="e.g. 3B or Flat 2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rentAmount" className="label">Monthly rent (₦)</label>
          <input id="rentAmount" name="rentAmount" type="number" min={1} required className="input" placeholder="e.g. 150000" />
        </div>
        <div>
          <label htmlFor="rentDueDay" className="label">Due day</label>
          <input id="rentDueDay" name="rentDueDay" type="number" min={1} max={28} defaultValue={1} className="input" />
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : 'Save tenant'}
      </button>
    </form>
  );
}
