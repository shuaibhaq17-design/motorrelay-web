"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function TrackingControls({ onChange }) {
  const [me, setMe] = useState(null);
  const [active, setActive] = useState(null); // server-truth active session (or null)
  const [threadId, setThreadId] = useState("");
  const [jobId, setJobId] = useState("");
  const [distance, setDistance] = useState(""); // km (optional on stop)
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [note, setNote] = useState("");
  const [lastError, setLastError] = useState("");
  const [lastSuccess, setLastSuccess] = useState("");

  // Mirror alerts into console for easy copying
  useEffect(() => {
    if (typeof window !== "undefined" && !window.__mrAlertPatched) {
      const orig = window.alert;
      window.alert = (msg) => { try { console.error("[ALERT]", msg); } catch {} orig(msg); };
      window.__mrAlertPatched = true;
    }
  }, []);

  function setSuccess(msg) {
    const text = String(msg ?? "");
    setLastSuccess(text);
    try { console.log("[TrackingControls:success]", text); } catch {}
  }
  function notifyError(msg) {
    const text = String(msg ?? "");
    setLastError(text);
    console.error("[TrackingControls]", text);
    alert(text);
  }

  async function whoami() {
    const { data, error } = await supabase.rpc("whoami");
    if (error) { setNote(error.message || "whoami failed"); return null; }
    return data || null;
  }

  // Normalize: treat {} as null
  async function getActive() {
    const { data, error } = await supabase.rpc("get_active_tracking_session");
    if (error) { setNote(error.message || "get_active failed"); return null; }
    if (data && !data.id) return null;
    return data || null;
  }

  async function refresh() {
    const a = await getActive();
    setActive(a);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancel) return;
      setMe(user || null);
      await refresh();
    })();
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => { cancel = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    if (busy) return;
    setBusy(true); setNote(""); setLastError(""); setLastSuccess("");
    try {
      const u = await whoami();
      if (!u) return notifyError("You are not signed in on the server (whoami = null). Sign in and try again.");

      const existing = await getActive();
      if (existing?.id) return notifyError("You already have an active session. Stop it first.");

      const { data, error } = await supabase.rpc("start_tracking_session", {
        p_thread_id: threadId.trim() || null,
        p_job_id: jobId.trim() || null,
      });
      if (error) throw error;

      setSuccess(`Started session id: ${data?.id || "(no id returned)"}`);
      await refresh();
      setThreadId(""); setJobId("");
      onChange?.();
    } catch (e) {
      notifyError(e?.message || "Could not start session");
    } finally { setBusy(false); }
  }

  async function handleStop() {
    if (busy) return;
    setBusy(true); setNote(""); setLastError(""); setLastSuccess("");
    try {
      const a = await getActive();
      if (!a?.id) return notifyError("No active session found on the server. Start a session first.");

      const km = distance.trim() ? Number(distance) : null;
      if (km != null && Number.isNaN(km)) return notifyError("Distance must be a number (km) or leave blank.");

      const { data, error } = await supabase.rpc("stop_tracking_session", {
        p_session_id: a.id,
        p_distance_km: km,
      });
      if (error) throw error;

      setSuccess(`Stopped session id: ${data?.id || "(no id returned)"}`);
      setDistance("");
      await refresh();
      onChange?.();
    } catch (e) {
      notifyError(e?.message || "Could not stop session");
    } finally { setBusy(false); }
  }

  async function handleForceStopAll() {
    if (busy) return;
    setBusy(true); setLastError(""); setLastSuccess("");
    try {
      const { data, error } = await supabase.rpc("end_all_my_active_sessions");
      if (error) throw error;
      setSuccess(`Force-stopped ${data || 0} active session(s).`);
      await refresh();
    } catch (e) {
      notifyError(e?.message || "Force stop failed");
    } finally { setBusy(false); }
  }

  const hasActive = !!(active && active.id && !active.ended_at);

  const elapsed = useMemo(() => {
    if (!hasActive) return null;
    const start = new Date(active.started_at).getTime();
    const end = active.ended_at ? new Date(active.ended_at).getTime() : Date.now();
    const sec = Math.max(0, Math.floor((end - start) / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [hasActive, active, tick]);

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Session Controls</h2>
        {note && <span className="text-xs text-amber-700">{note}</span>}
      </div>

      {!hasActive ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500">Thread ID (optional)</label>
            <input value={threadId} onChange={(e) => setThreadId(e.target.value)} placeholder="e.g. thread id" className="w-60 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500">Job ID (optional)</label>
            <input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="e.g. JOB-123" className="w-40 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button onClick={handleStart} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? "Starting…" : "Start Session"}
          </button>
          <button onClick={handleForceStopAll} disabled={busy} className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50">
            Force stop all
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Recording… <span className="font-mono">{elapsed}</span>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500">Distance (km, optional)</label>
            <input value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 12.7" className="w-32 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button onClick={handleStop} disabled={busy} className="rounded-lg bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? "Stopping…" : "Stop Session"}
          </button>
          <button onClick={handleForceStopAll} disabled={busy} className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50">
            Force stop all
          </button>
        </div>
      )}

      {/* Diagnostics + last messages */}
      <div className="mt-3 space-y-2 text-[11px] text-gray-600">
        <div>Client user: <code>{me?.id || "—"}</code></div>
        <div>Server active id: <code>{active?.id || "none"}</code></div>

        {lastSuccess && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
            <div className="font-medium">Last success:</div>
            <pre className="whitespace-pre-wrap break-words">{lastSuccess}</pre>
          </div>
        )}

        {lastError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
            <div className="font-medium">Last error (copyable):</div>
            <pre className="whitespace-pre-wrap break-words">{lastError}</pre>
          </div>
        )}

        <button onClick={refresh} className="rounded border px-2 py-0.5 text-[11px] hover:bg-gray-50">
          Refresh
        </button>
      </div>
    </div>
  );
}
