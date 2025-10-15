"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Portal from "../Portal";
import StartConfirmModal from "./StartConfirmModal";

function Dot({ className = "h-2.5 w-2.5" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>;
}
function PlayIcon({ className = "h-3.5 w-3.5" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M8 5v14l11-7-11-7z" /></svg>;
}
function Caret({ className = "h-3.5 w-3.5" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M7 10l5 5 5-5H7z" /></svg>;
}

export default function TrackingChip({ threadId, jobId = null, onChange }) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const router = useRouter();

  // Geo logging
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  async function refresh() {
    const { data } = await supabase.rpc("get_active_tracking_session");
    setActive(data ?? null);
  }
  useEffect(() => { refresh(); }, [threadId]);
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);

  const elapsed = useMemo(() => {
    if (!active?.started_at || active?.ended_at) return null;
    const s = Math.max(0, Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }, [active, tick]);

  const isActiveHere = !!(active?.id && !active?.ended_at && active.thread_id === threadId);

  function startGeoWatch() {
    if (!("geolocation" in navigator)) { alert("Geolocation is not available on this device."); return; }
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < 4000) return;
        lastSentRef.current = now;

        const { latitude, longitude, speed, heading } = pos.coords || {};
        const lat = Number(latitude), lng = Number(longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          try {
            await supabase.rpc("log_tracking_location", {
              p_lat: lat,
              p_lng: lng,
              p_speed_mps: Number.isFinite(speed) ? speed : null,
              p_heading: Number.isFinite(heading) ? heading : null,
              p_recorded_at: new Date(pos.timestamp).toISOString(),
            });
          } catch {}
        }
      },
      (err) => { console.error("Geolocation error:", err); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }
  function stopGeoWatch() {
    try { if (watchIdRef.current != null) navigator.geolocation?.clearWatch?.(watchIdRef.current); } catch {}
    watchIdRef.current = null; lastSentRef.current = 0;
  }
  useEffect(() => () => stopGeoWatch(), []);

  async function reallyStart() {
    if (busy) return;
    setBusy(true);
    try {
      const { data: cur } = await supabase.rpc("get_active_tracking_session");
      if (cur?.id && !cur?.ended_at) {
        await supabase.rpc("stop_tracking_session", { p_session_id: cur.id, p_distance_km: null });
      }
      const { error } = await supabase.rpc("start_tracking_session", {
        p_thread_id: String(threadId),
        p_job_id: jobId || null,
      });
      if (error) throw error;

      await refresh();
      startGeoWatch();
      onChange?.();
      router.push("/tracking/nav");
    } catch (e) {
      alert(e?.message || "Could not start tracking");
    } finally { setBusy(false); }
  }

  async function stopCurrent(withDistance = false) {
    if (busy) return;
    setBusy(true);
    try {
      const { data: cur } = await supabase.rpc("get_active_tracking_session");
      const sid = cur?.id || null;
      if (!sid) { alert("No active session to stop."); return; }

      let distance = null;
      if (withDistance) {
        let val = window.prompt("Enter distance (km) for this session (optional):", "");
        if (val != null) {
          val = val.trim();
          if (val === "") val = null;
          if (val != null && !/^\d+(\.\d+)?$/.test(val)) { alert("Please enter a number like 12 or 12.5"); setBusy(false); return; }
        }
        distance = val == null ? null : Number(val);
      }

      const { error } = await supabase.rpc("stop_tracking_session", { p_session_id: sid, p_distance_km: distance });
      if (error) throw error;
      stopGeoWatch();
      await refresh();
      onChange?.();
    } catch (e) {
      alert(e?.message || "Could not stop tracking");
    } finally { setBusy(false); }
  }

  function openMenu() {
    const el = btnRef.current;
    if (!el) { setOpen(true); return; }
    const r = el.getBoundingClientRect();
    const width = 208; // menu width
    const gap = 8;

    let left = Math.min(window.innerWidth - width - 8, Math.max(8, r.right - width));
    let top = r.bottom + gap;

    const expectedHeight = 160;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < expectedHeight) {
      top = Math.max(8, r.top - gap - expectedHeight);
    }

    setMenuPos({ top, left });
    setOpen(true);
  }

  if (!active?.id || active?.ended_at || !isActiveHere) {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          title="Start tracking on this thread"
        >
          <PlayIcon />
          Start
        </button>

        <StartConfirmModal
          open={showConfirm}
          onCancel={() => setShowConfirm(false)}
          onConfirm={async () => {
            setShowConfirm(false);
            await reallyStart();
          }}
        />
      </>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
        title="Tracking active"
      >
        <Dot className="h-2.5 w-2.5 text-emerald-600" />
        {elapsed}
        <Caret className="text-emerald-700" />
      </button>

      {open && (
        <Portal>
          {/* click-away */}
          <div className="fixed inset-0 z-[1000]" onClick={() => setOpen(false)} />
          {/* menu */}
          <div
            className="fixed z-[1001] w-52 rounded-xl border bg-white p-2 text-sm shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <Link href="/tracking/nav" className="block rounded-lg px-2 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
              Navigate (full-screen)
            </Link>
            <Link href="/tracking" className="block rounded-lg px-2 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
              Open tracking
            </Link>
            <button onClick={() => { setOpen(false); stopCurrent(false); }} className="mt-1 block w-full rounded-lg px-2 py-2 text-left hover:bg-gray-50">
              Stop
            </button>
            <button onClick={() => { setOpen(false); stopCurrent(true); }} className="block w-full w-full rounded-lg px-2 py-2 text-left text-rose-700 hover:bg-rose-50">
              Stop & set distance
            </button>
          </div>
        </Portal>
      )}
    </>
  );
}
