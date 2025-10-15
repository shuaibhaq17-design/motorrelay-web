"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient"; // keep if you set up Supabase; harmless otherwise

export default function TrackingWidget({ thread }) {
  const jobId = thread?.jobId ?? thread?.job_id ?? null;
  const title = thread?.title || thread?.counterpart || "Current Job";

  const [active, setActive] = useState(false);
  const [startAt, setStartAt] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  // Simple elapsed time (recomputed on render)
  const durationMs = startAt ? Date.now() - startAt : 0;

  // Start/stop interval cleanly when "active" changes
  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      setDistanceKm((d) =>
        Math.round((d + (Math.random() * 0.4 + 0.2)) * 100) / 100
      );
    }, 2000);

    timerRef.current = id;
    return () => {
      clearInterval(id);
      timerRef.current = null;
    };
  }, [active]);

  function start() {
    if (active) return;
    setStartAt(Date.now());
    setDistanceKm(0);
    setActive(true);
  }

  function end() {
    if (!active) return;
    setActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowSummary(true);
  }

  function reset() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActive(false);
    setStartAt(null);
    setDistanceKm(0);
    setShowSummary(false);
  }

  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  async function saveToJob() {
    try {
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        alert("Please log in first.");
        return;
      }

      if (!startAt) {
        alert("Start a tracking session before saving it.");
        return;
      }

      const payload = {
        thread_id: thread?.id ?? null,
        job_id: jobId,
        started_at: new Date(startAt).toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: Math.floor(durationMs / 1000),
        distance_km: distanceKm,
        created_by: user.id,
      };

      const { error } = await supabase.from("tracking_sessions").insert(payload);
      if (error) throw error;

      setShowSummary(false);
      alert("Tracking saved to job.");
    } catch (e) {
      console.error(e);
      alert(`Could not save tracking: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Tracking</p>
            <p className="font-semibold">
              {title} {active ? "[LIVE]" : "[Idle]"}
            </p>
          </div>

          <div className="flex gap-2">
            {!active ? (
              <button
                onClick={start}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
              >
                Start
              </button>
            ) : (
              <button
                onClick={end}
                className="rounded-xl bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
              >
                End
              </button>
            )}
            <button
              onClick={reset}
              className="rounded-xl border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Map placeholder (kept simple to avoid parser issues) */}
        <div className="relative h-44 w-full overflow-hidden rounded-xl border bg-emerald-50">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg border bg-white/80 px-3 py-1 text-sm text-gray-700">
              Map preview (simulated)
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-gray-500">Status</p>
            <p className={`font-semibold ${active ? "text-emerald-600" : "text-gray-700"}`}>
              {active ? "Live" : "Stopped"}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="font-semibold">{distanceKm.toFixed(2)} km</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-gray-500">Duration</p>
            <p className="font-semibold">{startAt ? fmt(durationMs) : "00:00:00"}</p>
          </div>
        </div>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Tracking summary</h3>
            <p className="mt-1 text-sm text-gray-600">{title}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-gray-500">Distance</p>
                <p className="font-semibold">{distanceKm.toFixed(2)} km</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-semibold">{fmt(durationMs)}</p>
              </div>
              <div className="col-span-2 rounded-xl border p-3">
                <p className="text-xs text-gray-500">Notes</p>
                <p>Generated from in-app tracking (demo).</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSummary(false)}
                className="rounded-xl border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                disabled={saving}
                onClick={saveToJob}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
