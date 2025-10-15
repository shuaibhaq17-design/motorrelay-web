"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function DebugAuthPage() {
  const [clientUser, setClientUser] = useState(null);
  const [serverUser, setServerUser] = useState(null);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setClientUser(user || null);

    const { data: who, error: whoErr } = await supabase.rpc("whoami");
    if (whoErr) setNote(`whoami error: ${whoErr.message}`);
    setServerUser(who || null);

    const { data: act, error: actErr } = await supabase.rpc("get_active_tracking_session");
    if (actErr) setNote(`get_active error: ${actErr.message}`);
    setActive(act || null);
  }

  useEffect(() => { load(); }, []);

  async function start() {
    setBusy(true); setNote("");
    try {
      const { error } = await supabase.rpc("start_tracking_session", { p_thread_id: null, p_job_id: null });
      if (error) throw error;
      await load();
    } catch (e) {
      setNote(`start error: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function stop() {
    setBusy(true); setNote("");
    try {
      const { data: act } = await supabase.rpc("get_active_tracking_session");
      if (!act?.id) { setNote("server says: no active session"); await load(); setBusy(false); return; }
      const { error } = await supabase.rpc("stop_tracking_session", { p_session_id: act.id, p_distance_km: null });
      if (error) throw error;
      await load();
    } catch (e) {
      setNote(`stop error: ${e.message}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-lg font-semibold">Debug Supabase Auth</h1>
      {note && <p className="text-sm text-amber-700">{note}</p>}

      <div className="rounded-xl border p-4 text-sm">
        <p>Client user: <code>{clientUser?.id || "—"}</code></p>
        <p>Server user (whoami): <code>{serverUser || "—"}</code></p>
        <p>Server active session: <code>{active?.id || "none"}</code></p>
      </div>

      <div className="flex gap-2">
        <button onClick={load} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Refresh</button>
        <button onClick={start} disabled={busy} className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50">Start</button>
        <button onClick={stop} disabled={busy} className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50">Stop</button>
      </div>

      <p className="text-xs text-gray-500">
        If <strong>Server user</strong> shows “—”, your RPC calls are unauthenticated.
        Make sure you’re signed in and your Supabase client uses the <code>NEXT_PUBLIC_SUPABASE_*</code> envs.
      </p>
    </div>
  );
}
