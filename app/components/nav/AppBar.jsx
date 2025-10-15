// app/components/nav/AppBar.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/jobs",      label: "Jobs",      icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v2"/>
      </svg>
  )},
  { href: "/messages",  label: "Messages",  icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a4 4 0 0 1-4 4H8l-4 4V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z"/>
      </svg>
  )},
  { href: "/membership",label: "Plans",     icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 17.3L18.2 21l-1.6-6.9L22 9.2l-7-.6L12 2 9 8.6l-7 .6 5.4 4.9L5.8 21z"/>
      </svg>
  )},
  { href: "/profile",   label: "Profile",   icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>
      </svg>
  )},
];

export default function AppBar() {
  const pathname = usePathname() || "/";
  return (
    <nav className="fixed left-0 right-0 bottom-0 h-[74px] bg-white border-t shadow-[0_-6px_24px_rgba(0,0,0,0.06)] sm:hidden">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-around gap-2">
        {items.map(it => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`appbtn flex flex-col items-center justify-center text-[12px] gap-1 min-w-[64px] ${active ? "text-emerald-700" : "text-gray-600"}`}
            >
              <span className={`appico grid place-items-center rounded-xl ${active ? "bg-emerald-50 border border-emerald-200" : ""}`}>
                <span className="w-6 h-6">{it.icon}</span>
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
