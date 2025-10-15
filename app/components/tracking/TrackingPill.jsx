"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

const normalizeActive = (row) => (row && typeof row === "object" && row.id ? row : null);

export default function TrackingPill({ threadId, jobId = null, className = "", onChange }) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [error, setError] = useState("");

  async function fetchActive() {
    const { data, error } = await supabase.rpc("get_active_tracking_session");
    if (error) { setError(error.message || "get_active failed"); return null; }
    return normalizeActive(data);
  }
  async function refresh() {
    const a = await fetchActive();
    setActive(a);
  }

  useEffect(() => {
    let stop = false;
    (async () => { if (!stop) await refresh(); })();
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => { stop = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function handleStart() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const existing = await fetchActive();
      if (existing?.id && existing.thread_id && existing.thread_id !== threadId) {
        setError("Already recording on another thread.");
        return;
      }
      if (existing?.id) {
        setError("Already recording.");
        return;
      }
      const { error } = await supabase.rpc("start_tracking_session", {
        p_thread_id: String(threadId),
        p_job_id: jobId || null,
      });
      if (error) throw error;
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e?.message || "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const a = await fetchActive();
      if (!a?.id) { setError("No active session."); return; }
      const { error } = await supabase.rpc("stop_tracking_session", { p_session_id: a.id, p_distance_km: null });
      if (error) throw error;
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e?.message || "Could not stop session");
    } finally {
      setBusy(false);
    }
  }

  async function moveHere() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const a = await fetchActive();
      if (a?.id) {
        const { error } = await supabase.rpc("stop_tracking_session", { p_session_id: a.id, p_distance_km: null });
        if (error) throw error;
      }
      const { error: e2 } = await supabase.rpc("start_tracking_session", {
        p_thread_id: String(threadId),
        p_job_id: jobId || null,
      });
      if (e2) throw e2;
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e?.message || "Could not move session");
    } finally {
      setBusy(false);
    }
  }

  const isActiveHere = !!(active?.id && active.thread_id === threadId && active.ended_at == null);
  const isActiveElsewhere = !!(active?.id && active.thread_id && active.thread_id !== threadId && active.ended_at == null);

  const elapsed = useMemo(() => {
    if (!active?.started_at) return null;
    const start = new Date(active.started_at).getTime();
    const end = active.ended_at ? new Date(active.ended_at).getTime() : Date.now();
    const s = Math.max(0, Math.floor((end - start) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }, [active, tick]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!active?.id ? (
        <>
          <button
            onClick={handleStart}
            disabled={busy}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title="Start tracking on this thread"
          >
            Start
          </button>
          <Link href="/tracking" className="rounded-full border px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50">Open tracking</Link>
        </>
      ) : isActiveHere ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {elapsed}
          </span>
          <button
            onClick={handleStop}
            disabled={busy}
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            title="Stop tracking"
          >
            Stop
          </button>
          <Link href="/tracking" className="rounded-full border px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50">Open</Link>
        </div>
      ) : isActiveElsewhere ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Active on another thread
          </span>
          <button
            onClick={moveHere}
            disabled={busy}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title="Stop there & start here"
          >
            Move here
          </button>
          <Link href="/tracking" className="rounded-full border px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50">Open</Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Recording…
          </span>
          <button
            onClick={handleStop}
            disabled={busy}
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      )}

      {error && (
        <span className="truncate text-[11px] text-red-600" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
