'use client';

import { useRouter } from 'next/navigation';

/**
 * BackButton
 * - If you pass forceHref (e.g. "/messages"), it ALWAYS goes there (no history steps).
 * - Otherwise it tries history back and falls back to fallbackHref.
 */
export default function BackButton({
  forceHref = null,
  fallbackHref = '/',
  label = 'Back',
  className = 'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50',
}) {
  const router = useRouter();

  function goBack() {
    if (forceHref) {
      router.push(forceHref); // ✅ never touches `params`
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button type="button" onClick={goBack} className={className}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
