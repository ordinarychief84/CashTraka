import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { RegisterSW } from '@/components/RegisterSW';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cashtraka.co'),
  title: {
    default:
      'CashTraka | Production Planning Software for Small Batch Businesses',
    template: '%s | CashTraka',
  },
  description:
    'CashTraka helps small batch businesses plan production, track raw materials, avoid shortages, manage orders, and generate invoices and receipts from one simple system.',
  keywords: [
    'production planning software',
    'inventory management for small manufacturers',
    'material planning software',
    'small business production planning',
    'manufacturing order tracking',
    'raw material inventory tracking',
    'small batch production software',
    'invoice and receipt software',
    'purchase order tracking',
    'production planning app Nigeria',
    'CashTraka',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CashTraka',
    title:
      'CashTraka | Production Planning Software for Small Batch Businesses',
    description:
      'Plan production, track materials, and avoid costly shortages. Built for small factories, skincare brands, food processors, fashion workshops, and more.',
    url: 'https://www.cashtraka.co/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashTraka | Production Planning for Small Batch Businesses',
    description:
      'Plan production, track materials, and avoid costly shortages from one simple system.',
  },
  // PWA metadata
  applicationName: 'CashTraka',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    title: 'CashTraka',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Blue primary — matches `brand-500` in tailwind.config and the top half
  // of the new logo. Surfaces in PWA theme colour + mobile browser chrome.
  themeColor: '#00B8E8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Legacy meta, still picked up by some crawlers. */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {/* Renders nothing for normal sessions; renders a sticky banner
            whenever an admin is impersonating a user. Server component,
            so it can't be bypassed by client-side state. */}
        <ImpersonationBanner />
        {children}
        {/* Global toast container — every form's save callback can call
            `toast.success(...)` / `toast.error(...)` to surface feedback
            without writing per-page snackbar plumbing. */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 3500 }}
        />
        <RegisterSW />
      </body>
    </html>
  );
}
