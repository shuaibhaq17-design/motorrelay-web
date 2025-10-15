'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthBadge() {
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setHasUser(!!user);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setHasUser(!!sess?.user);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  if (!hasUser) return null;

  async function signOut() {
    await supabase.auth.signOut();
    // You can redirect to / if you want:
    // window.location.assign('/');
  }

  return (
    <button
      onClick={signOut}
      className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-200"
      title="Sign out"
    >
      Sign out
    </button>
  );
}
