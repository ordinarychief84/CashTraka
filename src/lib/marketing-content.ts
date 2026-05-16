/**
 * Centralized marketing copy for the public website.
 *
 * The pivot moved CashTraka from a generic SMB payments tool to an
 * **operational planning system for small batch businesses**. To keep
 * the homepage, pricing, solutions, industries, and FAQ pages easy to
 * edit by non-engineers, every customer-facing string lives here.
 *
 * Edit this file; the marketing pages re-render with the new copy on
 * next deploy.
 */

import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Factory,
  FileText,
  Hammer,
  Leaf,
  Package,
  Palette,
  Receipt,
  Scissors,
  Printer,
  Truck,
  Wheat,
  BookOpen,
  PackageSearch,
} from 'lucide-react';

/* ── Hero ────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: 'Operational Planning for Small Batch Businesses',
  h1: 'Plan production, track materials, and avoid costly shortages.',
  sub: 'CashTraka helps small batch businesses manage customer orders, production, raw materials, inventory, purchases, invoices, and receipts from one simple operational system.',
  support:
    'Built for small factories, skincare brands, food processors, fashion workshops, furniture makers, agro-processors, printing shops, and packaging businesses.',
  trialNote: 'Every new account gets 30 days of Pro free. No card required.',
  primaryCta: { label: 'Start 30-day free trial', href: '/signup' },
  secondaryCta: { label: 'Book demo', href: '/contact?topic=demo' },
};

/* ── Problem ─────────────────────────────────────────────────────── */

export const PROBLEM = {
  heading: 'Most small production businesses run on WhatsApp, notebooks, and memory.',
  body: 'That works until orders increase, materials run out, production gets delayed, or a customer asks for an update you cannot answer quickly.',
  pains: [
    'Customer orders get scattered across chats',
    'Raw materials run out at the wrong time',
    'Production plans are not clearly tracked',
    'Inventory is hard to trust',
    'Supplier purchases are not organized',
    'Invoices and receipts are created too late',
  ],
  closing:
    'CashTraka brings orders, production, materials, invoices, and receipts into one simple workflow.',
};

/* ── Solution ────────────────────────────────────────────────────── */

export const SOLUTION = {
  heading: 'One lightweight system for daily production operations.',
  body: 'CashTraka gives small batch businesses the operational clarity they need without the cost and complexity of enterprise ERP software.',
  bullets: [
    'Track customer orders from request to delivery',
    'Create production orders and monitor progress',
    'Define materials needed for each product',
    'See material shortages before production starts',
    'Manage raw materials and finished goods',
    'Create purchase orders for suppliers',
    'Send invoices and receipts by WhatsApp',
    'View simple operational reports',
  ],
};

/* ── How it works ────────────────────────────────────────────────── */

export const HOW_IT_WORKS = {
  heading: 'From customer order to receipt in one flow.',
  steps: [
    {
      title: 'Receive an order',
      body: 'Capture customer details, items, quantity, due date, and notes.',
    },
    {
      title: 'Plan production',
      body: 'Create a production order and confirm what needs to be produced.',
    },
    {
      title: 'Check materials',
      body: 'CashTraka compares required materials against available stock and shows shortages.',
    },
    {
      title: 'Produce and update inventory',
      body: 'Track production progress and update raw material and finished goods stock.',
    },
    {
      title: 'Invoice, receive payment, and issue receipt',
      body: 'Send invoices, confirm payments, and generate receipts instantly.',
    },
  ],
};

/* ── Feature grid ────────────────────────────────────────────────── */

export type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const FEATURES: Feature[] = [
  {
    icon: ClipboardList,
    title: 'Customer Orders',
    body: 'Track orders, due dates, customer details, delivery notes, and order status.',
  },
  {
    icon: Factory,
    title: 'Production Orders',
    body: 'Plan what needs to be produced and monitor progress from planned to completed.',
  },
  {
    icon: BookOpen,
    title: 'Recipes & Materials Needed',
    body: 'Define what each product takes — CashTraka calculates batch cost and material requirements.',
  },
  {
    icon: AlertTriangle,
    title: 'Shortage Alerts',
    body: 'See missing raw materials before production starts, with supplier lead times factored in.',
  },
  {
    icon: PackageSearch,
    title: 'Inventory Tracking',
    body: 'Monitor raw materials, finished goods, low stock, and stock usage.',
  },
  {
    icon: Truck,
    title: 'Purchase Orders',
    body: 'Track supplier purchases — and let CashTraka auto-draft POs for low-stock materials.',
  },
  {
    icon: FileText,
    title: 'Invoices',
    body: 'Create professional invoices from orders or transactions.',
  },
  {
    icon: Receipt,
    title: 'Receipts',
    body: 'Auto-generate receipts after verified Paystack payments, or paste a bank-SMS alert to record cash and transfers.',
  },
  {
    icon: BarChart3,
    title: 'Operational Reports',
    body: 'Production, sales, inventory, purchases, and estimated profit — all from one report hub.',
  },
];

/* ── Shortage highlight ─────────────────────────────────────────── */

export const SHORTAGE = {
  heading: 'Know what you are missing before production starts.',
  body: 'Before you start production, CashTraka checks the materials needed against what you have in stock.',
  required: [
    { qty: '100', unit: 'bottles' },
    { qty: '100', unit: 'labels' },
    { qty: '10kg', unit: 'fragrance oil' },
  ],
  onHand: [
    { qty: '100', unit: 'bottles' },
    { qty: '100', unit: 'labels' },
    { qty: '4kg', unit: 'fragrance oil' },
  ],
  shortage: { qty: '6kg', unit: 'fragrance oil' },
  cta: { label: 'Start planning smarter', href: '/signup' },
};

/* ── Industries ──────────────────────────────────────────────────── */

export type Industry = {
  slug: string;
  icon: LucideIcon;
  title: string;
  pain: string;
  body: string;
};

export const INDUSTRIES: Industry[] = [
  {
    slug: 'skincare',
    icon: Palette,
    title: 'Skincare & Cosmetics',
    pain: 'Recipes, packaging, and batch counts get jumbled across notebooks.',
    body: 'Track formulas, packaging, raw materials, batch production, invoices, and receipts.',
  },
  {
    slug: 'food',
    icon: Leaf,
    title: 'Food Production',
    pain: 'Ingredients spoil or run out before the order is ready.',
    body: 'Manage ingredients, production plans, expiry dates, finished goods, and customer orders.',
  },
  {
    slug: 'fashion',
    icon: Scissors,
    title: 'Fashion & Tailoring',
    pain: 'Customer jobs, fabric usage, and delivery dates slip through the cracks.',
    body: 'Track customer jobs, fabric usage, production stages, invoices, and deliveries.',
  },
  {
    slug: 'furniture',
    icon: Hammer,
    title: 'Furniture & Woodwork',
    pain: 'Suppliers, materials, and production status live in different places.',
    body: 'Manage materials, production jobs, supplier purchases, and customer orders.',
  },
  {
    slug: 'printing',
    icon: Printer,
    title: 'Printing & Packaging',
    pain: 'Job orders pile up and stock of paper, ink, and packaging runs short.',
    body: 'Track job orders, materials, production progress, delivery, and payment records.',
  },
  {
    slug: 'agro-processing',
    icon: Wheat,
    title: 'Agro-Processing',
    pain: 'Raw materials, batches, and supplier records are hard to reconcile.',
    body: 'Manage raw materials, finished goods, supplier purchases, and production batches.',
  },
  {
    slug: 'small-factories',
    icon: Building2,
    title: 'Small Factories',
    pain: 'ERP software is overkill, but spreadsheets are not enough.',
    body: 'Organize orders, production schedules, inventory, suppliers, invoices, and receipts.',
  },
];

/* ── Invoices & receipts ────────────────────────────────────────── */

export const INVOICES_RECEIPTS = {
  heading: 'Invoice customers and send receipts without leaving your workflow.',
  body: 'CashTraka keeps your production, sales, invoices, and receipts connected. When work is completed or payment is received, you can generate professional documents immediately.',
  bullets: [
    'Create invoices from orders',
    'Send invoices by WhatsApp or email',
    'Generate receipts after payment',
    'Auto-generate receipts after verified Paystack payments',
    'Keep records linked to customers and transactions',
  ],
};

/* ── Dashboard ──────────────────────────────────────────────────── */

export const DASHBOARD = {
  heading: 'See what needs attention today.',
  body: 'Your dashboard shows the operational signals that matter most.',
  signals: [
    'Orders pending',
    'Production in progress',
    'Low materials',
    'Purchase orders pending',
    'Recent payments',
    'Completed production',
    'Outstanding invoices',
    'Inventory alerts',
  ],
};

/* ── Pricing ────────────────────────────────────────────────────── */

export type PricingPlan = {
  key: 'starter' | 'pro' | 'business';
  name: string;
  priceKobo: number;
  priceLabel: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  badge?: string;
};

export const PRICING_HEADING = 'Simple pricing for growing production businesses.';
export const PRICING_SUB =
  'Every new account gets 30 days of Pro free — no card required. Stay on Pro, drop to free Starter, or move up to Business when you need team access.';

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceKobo: 0,
    priceLabel: '₦0',
    blurb: 'Best for small businesses starting to organize orders and records.',
    features: [
      'Customer orders',
      'Products & raw materials',
      'Basic inventory tracking',
      'Manual invoices & receipts',
      'WhatsApp sharing',
      'Up to 50 orders/month',
    ],
    cta: { label: 'Start free', href: '/signup' },
  },
  {
    key: 'pro',
    name: 'Pro',
    priceKobo: 12_000_00,
    priceLabel: '₦12,000',
    blurb: 'Best for businesses managing daily production and materials. 30-day free trial included.',
    features: [
      'Everything in Starter, unlimited',
      'Production orders & batch costing',
      'Recipes / Materials Needed',
      'Lead-time aware shortage alerts',
      'Auto-drafted purchase orders',
      'Recurring production templates',
      'Supplier management',
      'Daily 7pm operational recap (email + WhatsApp share)',
      'Bank-SMS payment ingest',
      'Auto receipts from verified Paystack payments',
      'PDF invoices, receipts, and FIRS tax-invoice submission',
      '15 operational dashboards',
    ],
    cta: { label: 'Start 30-day free trial', href: '/signup?plan=pro' },
    badge: 'Most popular',
  },
  {
    key: 'business',
    name: 'Business',
    priceKobo: 35_000_00,
    priceLabel: '₦35,000',
    blurb: 'Best for teams and growing production businesses.',
    features: [
      'Everything in Pro',
      'Multi-user access with role permissions',
      'Per-document audit trail',
      'Custom branding on PDFs',
      'Automated VAT returns',
      'Priority support',
      'Dedicated onboarding',
    ],
    cta: { label: 'Talk to sales', href: '/contact?topic=sales' },
  },
];

export const PRICING_FAQS: { q: string; a: string }[] = [
  {
    q: 'How does the free trial work?',
    a: 'Every new account gets 30 days of Pro free, starting the day you sign up. No card required. When the trial ends you keep your data and drop to the free Starter plan unless you decide to stay on Pro or move to Business.',
  },
  {
    q: 'Can I start free?',
    a: 'Yes. After your 30-day Pro trial, the Starter plan is free and covers customer orders, products, raw materials, basic inventory, and manual invoices/receipts so you can keep running without paying anything.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Yes. Upgrade to Pro or Business at any time from your account settings — your data, customers, and history all move with you.',
  },
  {
    q: 'Do I need accounting knowledge?',
    a: 'No. CashTraka is for operations, not bookkeeping. If you can describe an order in WhatsApp, you can run it in CashTraka.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings; you keep access until the end of your current billing cycle, and your data stays available on the free plan.',
  },
  {
    q: 'Does CashTraka support invoices and receipts?',
    a: 'Yes. You can issue invoices and receipts on every plan, share them by WhatsApp or email, and auto-generate receipts after verified Paystack payments.',
  },
  {
    q: 'Does CashTraka support production planning?',
    a: 'Production planning, shortage alerts, recipes, and purchase orders are included on the Pro plan and above.',
  },
  {
    q: 'Does CashTraka work on mobile?',
    a: 'Yes. CashTraka is mobile-first and works well from any phone browser. No app install required.',
  },
];

/* ── Solutions page ──────────────────────────────────────────────── */

export const SOLUTIONS_PAGE = {
  metaTitle:
    'Production Planning, Inventory, Orders, Invoices and Receipts',
  metaDescription:
    'CashTraka brings customer orders, production planning, raw materials, inventory, purchase orders, invoices, and receipts into one simple operational system for small batch businesses.',
  h1: 'One system for orders, production, materials, inventory, invoices, and receipts.',
  sub: 'Replace the patchwork of WhatsApp chats, notebooks, and spreadsheets with a single workflow built for small batch production.',
  sections: [
    {
      icon: ClipboardList,
      title: 'Order Management',
      body: 'Capture customer orders, due dates, products, quantities, and order status.',
    },
    {
      icon: Factory,
      title: 'Production Planning',
      body: 'Turn customer demand into production orders and track what is in progress.',
    },
    {
      icon: Boxes,
      title: 'Materials and Inventory',
      body: 'Know what raw materials you have, what is reserved, what is used, and what is running low.',
    },
    {
      icon: AlertTriangle,
      title: 'Shortage Alerts',
      body: 'See what is missing before production starts.',
    },
    {
      icon: Truck,
      title: 'Purchases and Suppliers',
      body: 'Create purchase orders, track supplier deliveries, and manage supplier records.',
    },
    {
      icon: FileText,
      title: 'Invoices and Receipts',
      body: 'Create professional invoices and receipts connected to real transactions.',
    },
    {
      icon: BarChart3,
      title: 'Operational Reporting',
      body: 'See production, inventory, purchases, sales, and estimated profit across 15 dedicated dashboards.',
    },
    {
      icon: AlertTriangle,
      title: 'Daily Operational Recap',
      body: 'A 7pm WhatsApp-ready summary lands in your inbox — share with your team in one tap.',
    },
  ],
};

/* ── Industries page ─────────────────────────────────────────────── */

export const INDUSTRIES_PAGE = {
  metaTitle:
    'Production Planning Software for Skincare, Food, Fashion, Furniture and Small Factories',
  metaDescription:
    'CashTraka is built for small batch businesses that make, assemble, package, or process products — skincare, food, fashion, furniture, printing, agro-processing, and small factories.',
  h1: 'Built for small batch businesses that make, assemble, package, or process products.',
  sub: 'Each industry has its own quirks. CashTraka stays simple while handling what each one actually needs.',
};

/* ── FAQ page ────────────────────────────────────────────────────── */

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is CashTraka?',
    a: 'CashTraka is an operational planning system for small batch businesses. It helps businesses manage customer orders, production, raw materials, inventory, purchases, invoices, receipts, and reports.',
  },
  {
    q: 'Is CashTraka accounting software?',
    a: 'No. CashTraka focuses on operations, production planning, inventory, invoices, and receipts. It is not a full accounting or ERP system.',
  },
  {
    q: 'Who is CashTraka built for?',
    a: 'Small production businesses such as skincare brands, food processors, fashion workshops, furniture makers, printing businesses, agro-processors, packaging businesses, and small factories.',
  },
  {
    q: 'Can CashTraka track raw materials?',
    a: 'Yes. You can track raw materials, reorder levels, suppliers, expiry dates, and low stock alerts.',
  },
  {
    q: 'Can CashTraka plan production?',
    a: 'Yes. Create production orders, connect them to customer orders, track production status, and check required materials.',
  },
  {
    q: 'What are material shortage alerts?',
    a: 'Material shortage alerts show you when you do not have enough raw materials to complete a production order — before you start producing.',
  },
  {
    q: 'Can I generate invoices and receipts?',
    a: 'Yes. CashTraka supports invoices, receipts, PDF downloads, WhatsApp sharing, and Paystack-linked payment records.',
  },
  {
    q: 'Does CashTraka support purchase orders?',
    a: 'Yes. Create purchase orders for suppliers and track expected deliveries on the Pro plan and above.',
  },
  {
    q: 'Does CashTraka support barcode or QR scanning?',
    a: 'Yes. CashTraka supports phone-camera QR and barcode scanning for products and materials — works from any modern phone browser, no app install required.',
  },
  {
    q: 'Does CashTraka work on mobile?',
    a: 'Yes. CashTraka is mobile-friendly and built for businesses that work heavily from phones and WhatsApp.',
  },
  {
    q: 'Is CashTraka suitable for large factories?',
    a: 'CashTraka is designed for small and medium production businesses. It is not meant to replace enterprise ERP systems.',
  },
  {
    q: 'Can multiple staff use CashTraka?',
    a: 'Yes. The Business plan supports multi-user access with role permissions and a per-document audit trail.',
  },
  {
    q: 'Do I get a free trial?',
    a: 'Yes. Every new account gets 30 days of Pro for free — no card required. After the trial, you can keep Pro, drop to the free Starter plan, or upgrade to Business.',
  },
  {
    q: 'Can CashTraka send daily updates?',
    a: 'Yes. Pro and Business plans get a 7pm operational recap by email — orders today, production complete, low stock, outstanding invoices — with a one-tap WhatsApp share for your team.',
  },
];

/* ── Footer ──────────────────────────────────────────────────────── */

export const FOOTER = {
  tagline:
    'CashTraka helps small batch businesses plan production, track materials, manage inventory, and issue invoices and receipts from one simple system.',
  columns: {
    product: [
      { label: 'Orders', href: '/solutions#orders' },
      { label: 'Production', href: '/solutions#production' },
      { label: 'Materials', href: '/solutions#materials' },
      { label: 'Inventory', href: '/solutions#inventory' },
      { label: 'Invoices', href: '/solutions#invoices' },
      { label: 'Receipts', href: '/solutions#receipts' },
    ],
    solutions: [
      { label: 'Production Planning', href: '/solutions#production' },
      { label: 'Material Tracking', href: '/solutions#materials' },
      { label: 'Inventory Control', href: '/solutions#inventory' },
      { label: 'Purchase Orders', href: '/solutions#purchases' },
      { label: 'Operational Reports', href: '/solutions#reports' },
    ],
    industries: [
      { label: 'Skincare & Cosmetics', href: '/industries#skincare' },
      { label: 'Food Production', href: '/industries#food' },
      { label: 'Fashion & Tailoring', href: '/industries#fashion' },
      { label: 'Furniture & Woodwork', href: '/industries#furniture' },
      { label: 'Agro-Processing', href: '/industries#agro-processing' },
      { label: 'Printing & Packaging', href: '/industries#printing' },
    ],
    company: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Login', href: '/login' },
      { label: 'Start Free', href: '/signup' },
    ],
  },
};

/* ── Final CTA ───────────────────────────────────────────────────── */

export const FINAL_CTA = {
  heading: 'Run production with more control.',
  body: 'Stop relying on scattered chats, notebooks, and memory. Start managing orders, production, materials, invoices, and receipts from one simple system — free for 30 days, no card required.',
  primaryCta: { label: 'Start 30-day free trial', href: '/signup' },
  secondaryCta: { label: 'Book demo', href: '/contact?topic=demo' },
};

/* ── Re-exports for any tooling that needs the raw lists ───────── */

export const ALL_INDUSTRIES = INDUSTRIES;

// Decorative — used by a few components to size icon containers.
export { Package };
