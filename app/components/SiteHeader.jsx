'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function LogoMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-500 text-white shadow-sm">
      <span className="font-bold">MR</span>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let on = true;
    supabase.auth.getUser().then(({ data }) => on && setMe(data?.user || null));
    return () => { on = false; };
  }, []);

  // Hide on /login
  if (pathname?.startsWith("/login")) return null;

  return (
    <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3 px-4 py-3">
        {/* Left: Logo + brand */}
        <Link href="/" className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <div className="text-lg font-semibold">MotorRelay</div>
            <div className="text-[11px] text-gray-500 -mt-0.5">move smarter</div>
          </div>
        </Link>

        {/* Right: plan + sign out only (email hidden) */}
        <div className="flex items-center gap-2">
          <span className="badge badge-green">Bronze</span>
          {me ? (
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="rounded-full bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
