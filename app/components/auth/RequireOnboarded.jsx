"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function RequireOnboarded({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      const user = data?.user || null;
      if (!user) {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
        return;
      }

      const role = user.user_metadata?.role;
      const ok = role === "driver" || role === "dealer";
      if (!ok) {
        const next = encodeURIComponent(pathname || "/profile");
        router.replace(`/onboarding?next=${next}`);
        return;
      }

      setReady(true);
    })();

    return () => { alive = false; };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-gray-500">
        Checking setup…
      </div>
    );
  }

  return children;
}

