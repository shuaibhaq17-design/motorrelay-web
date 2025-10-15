// Simple custom SVG icons that use currentColor (Tailwind text color)

export function TickSingle({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11.5l4 3.2L16 5.8" />
    </svg>
  );
}

export function TickDouble({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 20" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 10.5l3.6 3.0L11.5 6.5" />
      <path d="M7.8 12.0l3.6 3.0L21.0 4.8" />
    </svg>
  );
}

// New: clock (sending)
export function TickClock({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 10V6" />
      <path d="M10 10l3 2" />
    </svg>
  );
}

// New: error (failed)
export function TickError({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M7 7l6 6M13 7l-6 6" />
    </svg>
  );
}
