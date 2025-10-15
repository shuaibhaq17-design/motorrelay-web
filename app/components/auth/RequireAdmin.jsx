"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const normalizeList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const ADMIN_IDS = normalizeList(process.env.NEXT_PUBLIC_ADMIN_USER_IDS);
const ADMIN_EMAILS = normalizeList(process.env.NEXT_PUBLIC_ADMIN_EMAILS).map((item) =>
  item.toLowerCase()
);
const DEV_ADMIN = process.env.NEXT_PUBLIC_DEV_ADMIN_ID || "";

export default function RequireAdmin({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ ready: false, denied: false });

  useEffect(() => {
    let alive = true;

    async function checkAccess() {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;

      const user = data?.user || null;
      if (error || !user) {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
        return;
      }

      const isAdmin = hasAdminAccess(user);
      setState({ ready: true, denied: !isAdmin });
    }

    checkAccess();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
      } else if (event === "SIGNED_IN") {
        setState((prev) => ({ ...prev, denied: !session?.user || !hasAdminAccess(session.user) }));
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, pathname]);

  if (!state.ready) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-gray-500">
        Checking admin access...
      </div>
    );
  }

  if (state.denied) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Access restricted</h1>
        <p className="text-sm text-gray-600">
          This area is only available to MotorRelay administrators. If you believe you should have access, contact the
          team to be added to the admin allowlist.
        </p>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          onClick={() => router.replace("/")}
        >
          Go back home
        </button>
      </div>
    );
  }

  return children;
}

export function hasAdminAccess(user) {
  if (!user) return false;
  if (ADMIN_IDS.length && ADMIN_IDS.includes(user.id)) return true;
  if (ADMIN_EMAILS.length && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  if (DEV_ADMIN && user.id === DEV_ADMIN) return true;
  return false;
}
