'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { hasAdminAccess } from '../components/auth/RequireAdmin';
import TrackingChip from '../components/tracking/TrackingChip';
import RequireAuth from '../components/auth/RequireAuth';
import RequireOnboarded from '../components/auth/RequireOnboarded';

const normalize = (s) => String(s || '').toLowerCase().trim();
const unread = (t) =>
  Boolean(t?.last_message_at && (!t?.last_read_at || String(t.last_message_at) > String(t.last_read_at)));

export default function MessagesIndexPage() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState('');

  const sorted = useMemo(
    () => [...rows].sort((a, b) => String(b.last_message_at || '').localeCompare(String(a.last_message_at || ''))),
    [rows]
  );
  const filtered = useMemo(() => {
    const n = normalize(q);
    if (!n) return sorted;
    return sorted.filter((t) => {
      const title = normalize(t.title || t.counterpart || '');
      const job   = normalize(t.job_id || '');
      const last  = normalize(t.last_message || '');
      return title.includes(n) || job.includes(n) || last.includes(n);
    });
  }, [q, sorted]);

  const unreadCount = useMemo(() => rows.reduce((acc, t) => acc + (unread(t) ? 1 : 0), 0), [rows]);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      if (!on) return;
      setMe(user);
      setIsAdmin(hasAdminAccess(user));
      let r = user?.user_metadata?.role || null;
      try { const ov = typeof window !== 'undefined' ? window.localStorage.getItem('mr_role_override') : null; if (ov) r = ov; } catch {}
      setRole(r);
      try { const p = typeof window !== 'undefined' ? window.localStorage.getItem('mr_plan') || '' : ''; setPlan(p); } catch {}

      const { data, error } = await supabase
        .from('message_threads')
        .select('id, title, counterpart, job_id, last_message, last_message_at, last_read_at, counterpart_last_read_at')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (!error && data) setRows(data);
      setLoading(false);

      const ch = supabase
        .channel('messages-index-threads')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'message_threads', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const t = payload.new;
            setRows((cur) => {
              const i = cur.findIndex((r) => r.id === t.id);
              if (i === -1) return cur;
              const next = cur.slice();
              next[i] = { ...next[i], ...t };
              return next;
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'message_threads', filter: `user_id=eq.${user.id}` },
          (payload) => setRows((cur) => [payload.new, ...cur])
        );

      ch.subscribe();
      return () => { supabase.removeChannel(ch); };
    })();

    return () => { on = false; };
  }, []);

  return (
    <RequireAuth>
      <RequireOnboarded>
    <div className="space-y-4">
      {/* Page title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{unreadCount} unread</span>
          {(isAdmin || (role === 'driver' && String(plan).toLowerCase() === 'gold')) && (
            <Link href="/planner" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">Planner</Link>
          )}
        </div>
      </div>

      {/* Outer rounded panel */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3">
        {/* Search box */}
        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats / jobs"
            className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {loading && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">Loading…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
            No conversations match your search.
          </div>
        )}

        {/* Tiles (exact style) */}
        <div className="space-y-3">
          {filtered.map((t) => {
            const title = t.title || t.counterpart || 'Conversation';
            const snippet = t.last_message || '--';
            const isUnread = unread(t);

            return (
              <div
                key={t.id}
                className="tile rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-tile"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/messages/${encodeURIComponent(t.id)}`}
                    className="flex flex-1 items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-gray-900">
                        {title}
                        {t.job_id ? <span className="text-gray-400"> - </span> : null}
                        {t.job_id ? <span className="text-gray-900">{t.job_id}</span> : null}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">{snippet}</p>
                    </div>
                    <div className="mt-1 shrink-0">
                      {isUnread ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-transparent" />
                      )}
                    </div>
                  </Link>

                  {/* Tracking controls are not shown on the index tiles */}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Placeholder panel like the preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Select a conversation</p>
        <div className="mt-2 w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400" />
      </div>
    </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}




