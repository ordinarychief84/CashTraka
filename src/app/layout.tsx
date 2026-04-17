import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegisterSW } from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'CashTraka — Know who paid, know who owes',
  description:
    'CashTraka helps small businesses and landlords track payments, see who owes them, and follow up in seconds.',
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
        {/* Legacy meta — still picked up by some crawlers. */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
