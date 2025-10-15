'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { hasAdminAccess } from '../components/auth/RequireAdmin';
import RequireAuth from '../components/auth/RequireAuth';
import RequireOnboarded from '../components/auth/RequireOnboarded';

const cls = (...xs) => xs.filter(Boolean).join(' ');

function Tile({ children, onClick, className }) {
  // Div-as-button for accessibility and to avoid nested <button> issues
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cls(
        'tile text-left bg-white p-4 rounded-2xl border w-full cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export default function JobsIndexPage() {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState('avail'); // 'avail' | 'cur' | 'done'
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      if (!on) return;
      setMe(user);
      setIsAdmin(hasAdminAccess(user));
      // allow admin view override for UI
      let r = user?.user_metadata?.role || null;
      try { const ov = typeof window !== 'undefined' ? window.localStorage.getItem('mr_role_override') : null; if (ov) r = ov; } catch {}
      setRole(r);
      try { const p = typeof window !== 'undefined' ? window.localStorage.getItem('mr_plan') || '' : ''; setPlan(p); } catch {}

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setJobs(data);
      setLoading(false);

      // live status updates
      const ch = supabase.channel('jobs-index')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `user_id=eq.${user.id}` },
          (payload) =>
            setJobs((cur) =>
              cur.map((j) => (j.id === payload.new.id ? { ...j, ...payload.new } : j))
            )
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'jobs', filter: `user_id=eq.${user.id}` },
          (payload) => setJobs((cur) => [payload.new, ...cur])
        );
      ch.subscribe();
      return () => supabase.removeChannel(ch);
    })();
    return () => { on = false; };
  }, []);

  const groups = useMemo(() => {
    const avail = jobs.filter((j) => j.status === 'open');
    const cur = jobs.filter((j) =>
      ['accepted', 'collected', 'in_transit', 'pending'].includes(j.status)
    );
    const done = jobs.filter((j) =>
      ['completed', 'delivered', 'cancelled'].includes(j.status)
    );
    return { avail, cur, done };
  }, [jobs]);

  async function mutate(fnName, id) {
    const { error } = await supabase.rpc(fnName, { p_job_id: id });
    if (error) alert(error.message || `Failed: ${fnName}`);
  }

  const groupList = tab === 'avail' ? groups.avail : tab === 'cur' ? groups.cur : groups.done;
  const showPlanner = isAdmin || (role === 'driver' && String(plan).toLowerCase() === 'gold');

  return (
    <RequireAuth>
      <RequireOnboarded>
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex items-center gap-2">
          {(isAdmin || role === 'dealer') && (
            <Link href="/create-job" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">+ Create Job</Link>
          )}
          {showPlanner && (
            <Link href="/planner" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Planner</Link>
          )}
        </div>
        <div className="inline-flex rounded-2xl overflow-hidden border">
          <button
            type="button"
            onClick={() => setTab('avail')}
            className={cls('px-3 py-2', tab === 'avail' && 'bg-emerald-600 text-white')}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => setTab('cur')}
            className={cls('px-3 py-2', tab === 'cur' && 'bg-emerald-600 text-white')}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setTab('done')}
            className={cls('px-3 py-2', tab === 'done' && 'bg-emerald-600 text-white')}
          >
            Completed
          </button>
        </div>
      </div>

      {loading && <div className="rounded-2xl border bg-white p-4">Loading…</div>}

      {!loading && groupList.length === 0 && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          No jobs here yet.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {groupList.map((j) => (
          <Tile
            key={j.id}
            onClick={() => (window.location.href = `/jobs/${encodeURIComponent(j.id)}`)}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">£{Number(j.price || 0).toFixed(0)}</div>
              <span
                className={cls(
                  'badge',
                  j.status === 'completed' || j.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-800'
                )}
              >
                {j.status}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {(j.company || 'Customer')} • {(j.vehicle_make || 'Vehicle')} •{' '}
              {(j.distance_mi || '—')} mi • {j.pickup_postcode} → {j.dropoff_postcode}
            </div>
            {j.title ? (
              <div className="text-xs text-gray-500 mt-1">Job # {j.title}</div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {tab === 'avail' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    mutate('fn_job_accept', j.id);
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
                >
                  Pick this job
                </button>
              )}

              {tab === 'cur' && (
                <>
                  <Link
                    href={`/jobs/${encodeURIComponent(j.id)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 rounded-xl border"
                  >
                    Open
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mutate('fn_job_collected', j.id);
                    }}
                    className="px-3 py-2 rounded-xl border"
                  >
                    Collected
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mutate('fn_job_delivered', j.id);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
                  >
                    Job completed
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mutate('fn_job_cancel', j.id);
                    }}
                    className="px-3 py-2 rounded-xl border text-red-700 border-red-300"
                  >
                    Cancel
                  </button>
                </>
              )}

              {tab === 'done' && (
                <Link
                  href={`/invoices/from-job/${encodeURIComponent(j.id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-2 rounded-xl border"
                >
                  View invoice
                </Link>
              )}
            </div>
          </Tile>
        ))}
      </div>
    </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
