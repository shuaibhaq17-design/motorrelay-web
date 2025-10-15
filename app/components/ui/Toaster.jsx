'use client';

import { useEffect, useState } from 'react';

// A tiny global toast host that listens for `window` events:
//   window.dispatchEvent(new CustomEvent('mr-toast', { detail: { title, message, href } }))
// and shows a banner for ~5s with an optional "Open" link.
export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(ev) {
      const { title = 'Notification', message = '', href = null } = ev.detail || {};
      const id = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
      setToasts((cur) => [...cur, { id, title, message, href }]);
      // auto-dismiss
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== id));
      }, 5200);
    }
    window.addEventListener('mr-toast', onToast);
    return () => window.removeEventListener('mr-toast', onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[100] mx-auto flex max-w-sm flex-col gap-2 px-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-brand-200 bg-white shadow-lg ring-1 ring-black/5"
        >
          <div className="flex items-start gap-3 p-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
              {t.message ? (
                <p className="truncate text-xs text-gray-600">{t.message}</p>
              ) : null}
            </div>
            {t.href ? (
              <a
                href={t.href}
                className="ml-auto rounded-lg bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700"
              >
                Open
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
