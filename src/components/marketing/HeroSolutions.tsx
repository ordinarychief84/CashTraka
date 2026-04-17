'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Play,
  Star,
  ShieldCheck,
  Check,
  MessageCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Reveal } from './Reveal';

/**
 * Redesigned marketing hero.
 *
 * One confident message, one primary CTA, a trust strip, and a layered
 * product visual that actually tells the product story (bank-alert verify
 * → receipt → WhatsApp chase). ICP self-selection is intentionally moved
 * *out* of the hero and into a dedicated "Pick your path" section so the
 * headline has a clear focal point.
 *
 * Visual stack (right column):
 *   back  — revenue panel with animated bar
 *   mid   — bank-alert verified card (pulses)
 *   front — WhatsApp reminder composer
 *
 * Background: soft dual-orb gradient + dot-grid pattern.
 */
export function HeroSolutions() {
  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      {/* Background: dot-grid + dual gradient orbs */}
      <BackgroundDecor />

      <div className="container-app relative z-10">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-10 lg:gap-16">
          {/* ─── LEFT: copy ─── */}
          <div>
            <Reveal from="up">
              {/* Trust row */}
              <div className="flex items-center gap-3 text-xs">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <span className="ml-1">4.9</span>
                </div>
                <span className="text-slate-500">
                  Trusted by Nigerian businesses & landlords
                </span>
              </div>
            </Reveal>

            <Reveal from="up" delay={80}>
              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-gradient-to-r from-brand-50 to-success-50/60 px-3 py-1 text-xs font-semibold text-brand-700">
                <Sparkles size={12} />
                14-day free trial · No card required
              </span>
            </Reveal>

            {/* Headline */}
            <Reveal from="up" delay={140}>
              <h1 className="mt-4 text-5xl font-black leading-[1.04] tracking-tight text-ink md:text-6xl lg:text-[4.25rem]">
                Stop chasing payments.{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-success-600 bg-clip-text text-transparent">
                    Start receiving
                  </span>
                  {/* underline swoosh */}
                  <svg
                    aria-hidden
                    viewBox="0 0 300 12"
                    className="absolute -bottom-1 left-0 h-2 w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8 Q 75 2 150 6 T 298 5"
                      stroke="url(#heroStroke)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="heroStroke" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#00B8E8" />
                        <stop offset="100%" stopColor="#8BD91E" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>{' '}
                them.
              </h1>
            </Reveal>

            {/* Sub */}
            <Reveal from="up" delay={200}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
                CashTraka verifies payments against your real bank alert,
                auto-issues receipts, and chases debts on WhatsApp — built for
                Nigerian small businesses and landlords.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal from="up" delay={260}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group relative inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-ink/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500 to-success-500 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative">Start free</span>
                  <ArrowRight
                    size={16}
                    className="relative transition group-hover:translate-x-0.5"
                  />
                </Link>
                <a
                  href="#solutions"
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-brand-400 hover:text-brand-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                    <Play size={10} fill="currentColor" className="ml-0.5" />
                  </span>
                  See how it works
                </a>
              </div>
            </Reveal>

            {/* Reassurance strip */}
            <Reveal from="up" delay={320}>
              <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-success-600" strokeWidth={3} />
                  Set up in 5 minutes
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-success-600" strokeWidth={3} />
                  Works on any phone
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-success-600" strokeWidth={3} />
                  Bank-alert verified
                </li>
              </ul>
            </Reveal>
          </div>

          {/* ─── RIGHT: layered product visual ─── */}
          <Reveal from="right" delay={200} distance={40} blur>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Background decor ───────────────────── */

function BackgroundDecor() {
  return (
    <>
      {/* Dot-grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.08) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse 70% 80% at 50% 30%, black 40%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 80% at 50% 30%, black 40%, transparent 80%)',
        }}
      />
      {/* Top-left cyan orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-brand-300/30 blur-[120px]"
      />
      {/* Bottom-right green orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-success-300/25 blur-[120px]"
      />
    </>
  );
}

/* ───────────────────── Layered product visual ───────────────────── */

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] md:max-w-none md:pl-6">
      {/* Back: revenue/collection panel */}
      <div
        className="relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-900/5 backdrop-blur"
        style={{ animation: 'float 7s ease-in-out infinite' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Received today
            </div>
            <div className="mt-1 text-3xl font-black tabular-nums text-ink">
              ₦142,500
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-[11px] font-bold text-success-700">
            <TrendingUp size={11} />
            +18%
          </div>
        </div>

        {/* Fake sparkline */}
        <svg
          viewBox="0 0 200 40"
          className="mt-3 h-10 w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00B8E8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00B8E8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 30 L20 26 L40 28 L60 22 L80 24 L100 18 L120 20 L140 12 L160 15 L180 8 L200 10 L200 40 L0 40 Z"
            fill="url(#sparkFill)"
          />
          <path
            d="M0 30 L20 26 L40 28 L60 22 L80 24 L100 18 L120 20 L140 12 L160 15 L180 8 L200 10"
            fill="none"
            stroke="#00B8E8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
          <Stat label="Paid" value="23" accent="success" />
          <Stat label="Pending" value="4" accent="amber" />
          <Stat label="Overdue" value="2" accent="red" />
        </div>
      </div>

      {/* Mid-front: bank-alert verified card */}
      <div
        className="absolute -right-4 top-[36%] w-[19rem] rounded-2xl border border-success-200 bg-white p-4 shadow-2xl shadow-success-500/10 md:-right-6"
        style={{ animation: 'float 8s ease-in-out infinite 0.7s' }}
      >
        <div className="flex items-start gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
            <ShieldCheck size={20} />
            {/* pulse */}
            <span className="absolute inset-0 rounded-full bg-success-500 opacity-60 animate-ping" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-success-700">
              Payment verified
            </div>
            <div className="mt-0.5 text-sm font-bold text-ink">
              GTBank credit · ₦45,000
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              From <span className="font-semibold text-ink">AMAKA NWOSU</span> · ref 9843
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-success-50/70 px-3 py-1.5 text-[11px] font-semibold text-success-700">
          <span>Receipt auto-sent</span>
          <Check size={13} strokeWidth={3} />
        </div>
      </div>

      {/* Front: WhatsApp reminder card */}
      <div
        className="relative mt-4 ml-auto w-[18rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 md:-mt-2 md:ml-[-2rem]"
        style={{ animation: 'float 9s ease-in-out infinite 1.4s' }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
            <MessageCircle size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink">Chidi Okafor</div>
            <div className="text-[10px] text-slate-500">Owes ₦7,500 · 2 days</div>
          </div>
          <span className="ml-auto rounded-full bg-owed-50 px-2 py-0.5 text-[9px] font-bold text-owed-700">
            Overdue
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-[11px] leading-relaxed text-slate-700">
          Hi Chidi 👋 Just a quick reminder about the ₦7,500 balance on your
          order. Let me know when it's sent.
        </div>
        <button
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-2 text-[11px] font-bold text-white shadow-sm"
          disabled
        >
          <MessageCircle size={12} />
          Send on WhatsApp
        </button>
      </div>

      {/* Keyframes for float */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-0.3deg); }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'success' | 'amber' | 'red';
}) {
  const accentMap = {
    success: 'text-success-700',
    amber: 'text-amber-600',
    red: 'text-owed-600',
  };
  return (
    <div className="text-center">
      <div className={`text-lg font-black tabular-nums ${accentMap[accent]}`}>
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
