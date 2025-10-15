'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from '../components/auth/RequireAuth';
import RequireOnboarded from '../components/auth/RequireOnboarded';

export default function ScorecardPage() {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      if (!on) return;
      setMe(user);

      const { data } = await supabase
        .from('jobs')
        .select('id,status,price,company,vehicle_make,created_at')
        .eq('user_id', user.id);

      if (on) {
        setJobs(data || []);
        setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const stats = useMemo(() => {
    const completed = jobs.filter(j => ['completed','delivered'].includes(j.status));
    const current   = jobs.filter(j => ['accepted','collected','in_transit','pending'].includes(j.status));
    const cancelled = jobs.filter(j => j.status === 'cancelled');

    const totalRevenue = completed.reduce((s, j) => s + Number(j.price || 0), 0);
    const avgPrice = completed.length ? totalRevenue / completed.length : 0;

    // Simple proxy for “on-time”: completed / (completed + cancelled)
    const denom = completed.length + cancelled.length || 1;
    const onTimePct = Math.round((completed.length / denom) * 100);

    return {
      completed: completed.length,
      current: current.length,
      cancelled: cancelled.length,
      totalRevenue,
      avgPrice,
      onTimePct,
    };
  }, [jobs]);

  const displayName = me?.user_metadata?.name || me?.email?.split('@')[0] || 'Driver';
  const rating = 4.8; // (placeholder – wire to real ratings later)

  return (
    <RequireAuth>
      <RequireOnboarded>
    <div className="bg-white p-6 rounded-2xl border grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <div className="w-40 h-40 rounded-2xl bg-gray-100 border grid place-items-center">Image</div>
        <div className="mt-3 text-sm text-gray-600">
          Placeholder photo assigned at registration.
        </div>
      </div>

      <div className="md:col-span-2 grid gap-4">
        <div>
          <div className="text-lg font-semibold">{displayName}</div>
          <div className="text-sm text-gray-600">
            {me?.email} • MotorRelay driver
          </div>
          <div className="text-amber-500 mt-1">
            ★★★★★ <span className="text-xs text-gray-500">( {rating.toFixed(1)} )</span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border p-4">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">Completed jobs</div>
              <div className="text-2xl font-bold mt-1">{stats.completed}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">Active jobs</div>
              <div className="text-2xl font-bold mt-1">{stats.current}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">On-time</div>
              <div className="text-2xl font-bold mt-1">{stats.onTimePct}%</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">Total revenue</div>
              <div className="text-2xl font-bold mt-1">£{stats.totalRevenue.toFixed(0)}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">Avg. price</div>
              <div className="text-2xl font-bold mt-1">£{stats.avgPrice.toFixed(0)}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">Cancelled</div>
              <div className="text-2xl font-bold mt-1">{stats.cancelled}</div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-500">
          Recent reviews: <i>Reliable, careful with EVs, good comms.</i>
        </div>
      </div>
    </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
