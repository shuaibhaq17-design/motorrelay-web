"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
        return;
      }
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-gray-500">
        Checking sign-in…
      </div>
    );
  }

  return children;
}
