"use client";

import Portal from "../Portal";

export default function StartConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <Portal>
      {/* backdrop */}
      <div className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      {/* card */}
      <div className="fixed inset-0 z-[1101] grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
          <h3 className="text-base font-semibold">Start tracking & navigation?</h3>
          <p className="mt-2 text-sm text-gray-600">
            We’ll share your live GPS while tracking is active. You can stop tracking at any time.
          </p>
          <ul className="mt-3 list-inside list-disc text-sm text-gray-600">
            <li>Battery & data usage may increase.</li>
            <li>We’ll show a live map and quick directions.</li>
          </ul>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={onCancel} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={async () => {
                // Try to nudge the browser to ask permission early; ignore errors
                try {
                  await new Promise((resolve) => {
                    if (!("geolocation" in navigator)) return resolve();
                    navigator.geolocation.getCurrentPosition(
                      () => resolve(),
                      () => resolve(),
                      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                  });
                } catch {}
                onConfirm?.();
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Start navigation
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
