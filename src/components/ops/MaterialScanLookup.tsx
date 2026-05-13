'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarcodeScanButton } from './BarcodeScanButton';

/**
 * Scan a barcode and jump to the matching raw material by SKU. If no
 * match is found we surface a small inline notice instead of an alert.
 */
export function MaterialScanLookup({ label = 'Scan material' }: { label?: string }) {
  const router = useRouter();
  const [notFound, setNotFound] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleScan(text: string) {
    setNotFound(null);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/raw-materials?q=${encodeURIComponent(text)}&take=1`,
      );
      const body = await res.json();
      const match = body?.data?.rows?.[0];
      if (match) {
        router.push(`/materials/${match.id}`);
        return;
      }
      setNotFound(text);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <BarcodeScanButton label={label} onScan={handleScan} />
      {searching && <p className="text-xs text-slate-500">Looking up…</p>}
      {notFound && !searching && (
        <p className="text-xs text-rose-600">No material matches “{notFound}”.</p>
      )}
    </div>
  );
}
