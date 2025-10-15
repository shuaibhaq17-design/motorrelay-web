"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";         // app/tracking/nav -> up 3 -> lib
import LiveMap from "../../components/map/LiveMap";              // app/tracking/nav -> up 2 -> app/components
import TurnByTurnNav from "../../components/map/TurnByTurnNav";
import BackButton from "../../components/BackButton";

// --- Local helpers (so we don't rely on a named export) ---
function toRad(d) { return (d * Math.PI) / 180; }
function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
// ----------------------------------------------------------

function ExternalNavIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/><path d="M5 5h6v2H7v10h10v-4h2v6H5z"/></svg>;
}
function MsgIcon({ className = "h-4 w-4" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M4 5h16v12H7l-3 3V5z"/></svg>;
}

export default function NavPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState(null);
  const [latest, setLatest] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let subLoc, subMsg;

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setMe(user);

      const { data: sess } = await supabase.rpc("get_active_tracking_session");
      if (!sess?.id || sess?.ended_at) {
        alert("No active session. Start tracking from a conversation.");
        router.push("/messages");
        return;
      }
      setActive(sess);

      if (sess.thread_id) {
        const { data: tRow } = await supabase
          .from("message_threads")
          .select("id, counterpart, job_id, dest_label, dest_lat, dest_lng")
          .eq("id", sess.thread_id)
          .eq("user_id", user.id)
          .maybeSingle();
        setThread(tRow || null);
      }

      const { data: rows } = await supabase.rpc("get_active_session_locations", { p_limit: 120 });
      const pts = (rows || []).map(r => ({ lat: r.lat, lng: r.lng, t: r.recorded_at, session_id: r.session_id }));
      setBreadcrumb(pts.reverse());
      const last = pts[pts.length - 1];
      setLatest(last ? { lat: last.lat, lng: last.lng } : null);

      subLoc = supabase
        .channel("nav-locations")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "tracking_locations", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const r = payload.new;
            if (r.session_id !== sess.id) return;
            const pt = { lat: r.lat, lng: r.lng, t: r.recorded_at };
            setBreadcrumb((cur) => [...cur.slice(-119), pt]);
            setLatest({ lat: r.lat, lng: r.lng });
          }
        ).subscribe();

      if (sess.thread_id) {
        subMsg = supabase
          .channel("nav-msgs")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` },
            (payload) => {
              const row = payload.new;
              if (row.thread_id !== sess.thread_id) return;
              if (row.author_id === user.id) return;
              const text = (row.body || "").trim();
              setBanner({ body: text ? text.slice(0, 120) : "New message", at: new Date().toISOString(), threadId: sess.thread_id });
            }
          ).subscribe();
      }
    }

    boot();

    return () => {
      if (subLoc) supabase.removeChannel(subLoc);
      if (subMsg) supabase.removeChannel(subMsg);
    };
  }, [router]);

  const destination = useMemo(() => {
    if (active?.dest_lat && active?.dest_lng) return { lat: active.dest_lat, lng: active.dest_lng };
    if (thread?.dest_lat && thread?.dest_lng) return { lat: thread.dest_lat, lng: thread.dest_lng };
    return null;
  }, [active?.dest_lat, active?.dest_lng, thread?.dest_lat, thread?.dest_lng]);

  const distanceKm = useMemo(() => {
    if (!latest || !destination) return null;
    return haversineMeters(latest, destination) / 1000;
  }, [latest, destination]);

  function openExternalNavigation() {
    if (!destination) { alert("No destination set for this job."); return; }
    const { lat, lng } = destination;
    const ua = (typeof navigator !== "undefined" ? navigator.userAgent || "" : "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      window.location.href = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");
  }

  const title = `${thread?.counterpart || "Job"}${thread?.job_id ? " - " + thread.job_id : ""}`;

  return (
    <div className="fixed inset-0 z-0 bg-white">
      {/* Top pills (small, right) */}
      <div className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-white/90 to-transparent px-3 pt-2">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between">
          <BackButton forceHref="/messages" />
          <div className="truncate px-2 text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/messages/${encodeURIComponent(thread?.id || "")}`)}
              className="inline-flex items-center gap-1 rounded-full border bg-white/90 px-3 py-1 text-[11px] shadow"
              title="Messages"
            >
              <MsgIcon /> Messages
            </button>
            <button
              onClick={openExternalNavigation}
              className="inline-flex items-center gap-1 rounded-full border bg-white/90 px-3 py-1 text-[11px] shadow"
              title="Open in Maps"
            >
              <ExternalNavIcon className="h-4 w-4" /> Open Maps
            </button>
          </div>
        </div>

        {/* New message banner */}
        {banner && (
          <div className="mx-auto mt-2 max-w-screen-lg">
            <div className="flex items-center justify-between rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow">
              <div className="truncate">
                <span className="font-medium">New message:</span> <span className="truncate">{banner.body}</span>
              </div>
              <div className="flex items-center gap-2">
                {banner.threadId && (
                  <button
                    className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
                    onClick={() => router.push(`/messages/${encodeURIComponent(banner.threadId)}`)}
                  >
                    View
                  </button>
                )}
                <button className="rounded-lg border px-2 py-1" onClick={() => setBanner(null)}>Dismiss</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="absolute inset-0">
        <div className="relative mx-auto h-full w-full max-w-screen-lg px-3 pt-14 pb-28">
          <BackButton
            fallbackHref="/messages"
            className="absolute left-6 top-6 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow hover:bg-emerald-50"
          />
          <LiveMap
            current={latest}
            path={breadcrumb}
            destination={destination}
            className="h-full w-full overflow-hidden rounded-2xl border"
          />
        </div>
      </div>

      {/* Turn-by-turn banner (bottom) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20">
        <div className="mx-auto w-full max-w-screen-lg px-3">
          <TurnByTurnNav
            current={latest}
            destination={destination}
            className="pointer-events-auto"
          />
        </div>
      </div>
    </div>
  );
}
