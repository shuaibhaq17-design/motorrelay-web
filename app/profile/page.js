'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { hasAdminAccess } from '../components/auth/RequireAdmin';
import RequireAuth from '../components/auth/RequireAuth';
import RequireOnboarded from '../components/auth/RequireOnboarded';

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!on) return;
      setMe(user);
      let r = user?.user_metadata?.role || null;
      try { const ov = typeof window !== 'undefined' ? window.localStorage.getItem('mr_role_override') : null; if (ov) r = ov; } catch {}
      setRole(r);
      try { const p = typeof window !== 'undefined' ? window.localStorage.getItem('mr_plan') || '' : ''; setPlan(p); } catch {}
    })();
    return () => { on = false; };
  }, []);
  const showPlanner = hasAdminAccess(me) || (role === 'driver' && String(plan).toLowerCase() === 'gold');
  return (
    <RequireAuth>
      <RequireOnboarded>
        <div>
          <h1 className="text-2xl font-bold mb-3">Profile</h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/scorecard" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Scorecard</div><div className="text-sm text-gray-600">View rating, jobs, and reviews</div></Link>
            <Link href="/profile/jobs" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Jobs</div><div className="text-sm text-gray-600">All completed jobs & invoices</div></Link>
            <Link href="/invoices" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Invoice builder</div><div className="text-sm text-gray-600">Create standalone invoices</div></Link>
            <Link href="/account" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Account settings</div><div className="text-sm text-gray-600">Manage your details</div></Link>
            <Link href="/legal" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Legal</div><div className="text-sm text-gray-600">GDPR, Terms, Licensing</div></Link>
            <Link href="/plans" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Membership</div><div className="text-sm text-gray-600">Pick a plan and manage benefits</div></Link>
            {showPlanner ? (
              <Link href="/planner" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Planner</div><div className="text-sm text-gray-600">Weekly calendar & automation</div></Link>
            ) : null}
          </div>
        </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
