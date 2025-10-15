'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const Item = ({ href, label, icon, active }) => (
  <Link
    href={href}
    className={[
      "flex flex-col items-center justify-center w-full h-full",
      active ? "text-brand-600" : "text-gray-500 hover:text-gray-700"
    ].join(" ")}
  >
    <div className={[
      "grid h-10 w-10 place-items-center rounded-2xl border",
      active ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"
    ].join(" ")}>
      {icon}
    </div>
    <span className="mt-1 text-[11px]">{label}</span>
  </Link>
);

export default function BottomNav() {
  const p = usePathname() || "/";
  const is = (s) => p === s || p.startsWith(s + "/");

  return (
    <nav
      style={{ height: "var(--tabbar-h)" }}
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-white"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2">
        <Item href="/"          label="Home"     active={is("/")}         icon={<HomeIcon />} />
        <Item href="/jobs"      label="Jobs"     active={is("/jobs")}      icon={<BriefcaseIcon />} />
        <Item href="/messages"  label="Messages" active={is("/messages")}  icon={<ChatIcon />} />
        <Item href="/plans"     label="Plans"    active={is("/plans")}     icon={<StarIcon />} />
        <Item href="/profile"   label="Profile"  active={is("/profile")}   icon={<UserIcon />} />
      </div>
    </nav>
  );
}

/* Tiny inline icons to avoid any dependency */
function HomeIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z" stroke="currentColor" strokeWidth="1.6" /><path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.6" /></svg>); }
function BriefcaseIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 8.5h18v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-10Z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12.5h18" stroke="currentColor" strokeWidth="1.6"/></svg>); }
function ChatIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 13.5a7.5 7.5 0 1 1-3.3-6.2L21 4.5v9Z" stroke="currentColor" strokeWidth="1.6" /><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg>); }
function StarIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.7 6.7 19.1l1-5.8-4.2-4.1 5.9-.9L12 3Z" stroke="currentColor" strokeWidth="1.6"/></svg>); }
function UserIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.6"/></svg>); }
