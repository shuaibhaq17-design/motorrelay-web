'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const cx = (...xs) => xs.filter(Boolean).join(' ');

// === Icons (match the Netlify prototype) ===
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M4 12l8-7 8 7" />
      <path d="M12 5v16" />
    </svg>
  );
}

function IconJobs() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 7V5a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v2" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M21 15a4 4 0 0 1-4 4H8l-4 4V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function IconPlans() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M12 17.3L18.2 21l-1.6-6.9L22 9.2l-7-.6L12 2 9 8.6l-7 .6 5.4 4.9L5.8 21z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function BottomAppBar() {
  const pathname = usePathname() || '/';

  const items = [
    { href: '/',          label: 'Home',     Icon: IconHome },
    { href: '/jobs',      label: 'Jobs',     Icon: IconJobs },
    { href: '/messages',  label: 'Messages', Icon: IconMessages },
    { href: '/membership',label: 'Plans',    Icon: IconPlans },
    { href: '/profile',   label: 'Profile',  Icon: IconProfile },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[74px] bg-white border-t shadow-[0_-6px_24px_rgba(0,0,0,0.06)] z-30">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-around px-6">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="appbtn flex flex-col items-center justify-center gap-1 min-w-[64px] text-[12px]"
            >
              <span
                className={cx(
                  'appico grid place-items-center rounded-xl p-1',
                  active
                    ? 'bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700'
                    : 'text-gray-600'
                )}
              >
                <Icon />
              </span>
              <span className={active ? 'text-emerald-700' : 'text-gray-600'}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
