"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";                // <- FIXED (two dots)
import LiveMap, { haversineMeters } from "../components/map/LiveMap"; // <- FIXED (one dot)
import TurnByTurnNav from "../components/map/TurnByTurnNav";          // <- FIXED (one dot)
import BackButton from "../components/BackButton";                     // <- FIXED (one dot)
import RequireAuth from "../components/auth/RequireAuth";
import RequireOnboarded from "../components/auth/RequireOnboarded";

function MsgIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4 5h16v12H7l-3 3V5z" />
    </svg>
  );
}

export default function TrackingPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState(null);
  const [latest, setLatest] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);

  useEffect(() => {
    let subLoc;

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setMe(user);

      const { data: sess } = await supabase.rpc("get_active_tracking_session");
      if (!sess?.id || sess?.ended_at) {
        // Nothing active: keep page but show empty map
        setActive(null);
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
        .channel("tracking-locations")
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "tracking_locations", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const r = payload.new;
            if (sess?.id && r.session_id !== sess.id) return;
            const pt = { lat: r.lat, lng: r.lng, t: r.recorded_at };
            setBreadcrumb((cur) => [...cur.slice(-119), pt]);
            setLatest({ lat: r.lat, lng: r.lng });
          }
        ).subscribe();
    }

    boot();

    return () => {
      if (subLoc) supabase.removeChannel(subLoc);
    };
  }, [router]);

  const destination = useMemo(() => {
    if (active?.dest_lat && active?.dest_lng) return { lat: active.dest_lat, lng: active.dest_lng };
    if (thread?.dest_lat && thread?.dest_lng) return { lat: thread.dest_lat, lng: thread.dest_lng };
    return null;
  }, [active?.dest_lat, active?.dest_lng, thread?.dest_lat, thread?.dest_lng]);

  return (
    <RequireAuth>
      <RequireOnboarded>
    <div className="fixed inset-0 z-0 bg-white">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-3 py-2">
          <BackButton forceHref="/messages" />
          <div className="min-w-0 truncate text-sm font-semibold">
            {thread?.counterpart || "Tracking"}
            {thread?.job_id ? ` — ${thread.job_id}` : ""}
          </div>
          <div className="flex items-center gap-2">
            {thread?.id && (
              <button
                onClick={() => router.push(`/messages/${encodeURIComponent(thread.id)}`)}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px]"
                title="Messages"
              >
                <MsgIcon /> Messages
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="absolute inset-0 pt-12 pb-28">
        <div className="mx-auto h-full w-full max-w-screen-lg px-3">
          <LiveMap
            current={latest}
            path={breadcrumb}
            destination={destination}
            className="h-full w-full overflow-hidden rounded-2xl border"
          />
        </div>
      </div>

      {/* Bottom turn-by-turn banner */}
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
      </RequireOnboarded>
    </RequireAuth>
  );
}
