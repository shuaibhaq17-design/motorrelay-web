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
  const driverHighlights = [
    'Browse nearby runs by pickup postcode and vehicle type.',
    'Track applications and receive alerts when dealers respond.',
    'Upload PODs and invoices straight from your dashboard.'
  ];

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
            <Link href="/profile/jobs" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Jobs</div><div className="text-sm text-gray-600">All completed jobs & invoices</div></Link>
            <Link href="/invoices" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Invoice builder</div><div className="text-sm text-gray-600">Create standalone invoices</div></Link>
            <Link href="/account" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Account settings</div><div className="text-sm text-gray-600">Manage your details</div></Link>
            <Link href="/legal" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Legal</div><div className="text-sm text-gray-600">GDPR, Terms, Licensing</div></Link>
            {showPlanner ? (
              <Link href="/planner" className="tile bg-white p-4 rounded-2xl border text-left"><div className="text-xl font-semibold">Planner</div><div className="text-sm text-gray-600">Weekly calendar & automation</div></Link>
            ) : null}
          </div>

          {role === 'driver' ? (
            <div className="mt-6 space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Start earning today</h2>
                <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Drivers</span>
              </div>
              <p className="text-sm text-gray-600">
                See marketplace runs near you, apply in minutes, and keep your paperwork in one place.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                {driverHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Browse jobs
                </Link>
                <p className="text-xs text-gray-500">
                  Tip: add availability in Planner to get matched faster.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
