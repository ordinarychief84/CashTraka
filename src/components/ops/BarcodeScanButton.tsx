'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

/**
 * Phone-camera barcode + QR scanner. Tap the button → modal opens →
 * the camera feed plays inside it → the first decoded result is
 * delivered to `onScan`. No backend, no server round-trip.
 *
 * The `@zxing/browser` lib is loaded dynamically so we don't ship its
 * ~200kb to users who never scan anything.
 *
 * Use anywhere a SKU / barcode lookup is helpful: material edit page,
 * production start, PO receive, etc.
 */
export function BarcodeScanButton({
  label = 'Scan code',
  onScan,
  className,
}: {
  label?: string;
  onScan: (text: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Start camera when modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setError('No camera available.');
          return;
        }
        // Prefer rear camera by name; fall back to first device.
        const back =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current,
          (result) => {
            if (cancelled || !result) return;
            const text = result.getText();
            if (!text) return;
            onScan(text);
            controls.stop();
            setOpen(false);
          },
        );
        controlsRef.current = controls;
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message ?? 'Camera unavailable';
        setError(/permission/i.test(msg) ? 'Camera permission denied.' : msg);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700'
        }
      >
        <Camera size={16} />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <h3 className="mb-2 pr-8 text-base font-bold text-slate-900">{label}</h3>
            {error ? (
              <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                Point your camera at a barcode or QR code. The result fills in automatically.
              </p>
            )}
            <div className="aspect-square overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
