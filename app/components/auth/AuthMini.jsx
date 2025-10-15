"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function AuthMini() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const letter =
    (user?.user_metadata?.name?.[0] ||
     user?.email?.[0] || "U").toUpperCase();

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
        title={user.email || "Account"}
      >
        <span className="text-sm font-semibold">{letter}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border bg-white p-2 text-sm shadow-lg">
          <div className="truncate px-2 py-1 text-xs text-gray-500">
            {user.email}
          </div>
          <Link
            href="/tracking"
            className="block rounded-lg px-2 py-2 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Open tracking
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); setOpen(false); }}
            className="block w-full rounded-lg px-2 py-2 text-left text-rose-700 hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
