"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }
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
function bearingDegrees(a, b) {
  if (!a || !b) return null;
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const λ1 = toRad(a.lng), λ2 = toRad(b.lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}
function compassLabel(deg) {
  if (deg == null) return "—";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
function minutesFmt(mins) {
  const s = Math.round(Number(mins) * 60);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function titleFromStep(step) {
  if (!step) return "—";
  const t = step?.maneuver?.type || "continue";
  const mod = step?.maneuver?.modifier;
  const road = step?.name || "road";
  const dir = mod ? ` ${String(mod).toLowerCase()}` : "";
  switch (t) {
    case "depart": return `Head${dir} on ${road}`;
    case "turn": return `Turn${dir} onto ${road}`;
    case "merge": return `Merge${dir} onto ${road}`;
    case "off ramp": return `Take the exit${dir} toward ${road}`;
    case "roundabout": return `Enter roundabout toward ${road}`;
    case "rotary": return `Enter rotary toward ${road}`;
    case "arrive": return `Arrive at destination`;
    case "new name": return `Continue onto ${road}`;
    case "continue": default: return `Continue${road ? " on " + road : ""}`;
  }
}

/**
 * Props:
 * - current: {lat, lng} live position
 * - destination: {lat, lng}
 * - averageSpeedKmh: fallback speed for ETA (default 50)
 * - className: wrapper styles
 *
 * Fetches an OSRM route, shows next instruction, distance-to-next, bearing arrow, and ETA.
 */
export default function TurnByTurnNav({
  current,
  destination,
  averageSpeedKmh = 50,
  className = "",
}) {
  const [route, setRoute] = useState(null); // raw OSRM route
  const [error, setError] = useState("");
  const [lastFetchAt, setLastFetchAt] = useState(0);

  // Fetch route on start and periodically
  async function fetchRoute() {
    try {
      setError("");
      if (!current || !destination) return;
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${current.lng},${current.lat};${destination.lng},${destination.lat}` +
        `?overview=full&geometries=geojson&steps=true&annotations=distance`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.code !== "Ok" || !json.routes?.[0]) throw new Error("No route");
      setRoute(json.routes[0]);
      setLastFetchAt(Date.now());
    } catch (e) {
      setError("Routing failed");
    }
  }

  // Initial + refresh every 20s, or when we move > 100m
  const lastPosRef = useRef(null);
  useEffect(() => {
    if (!current || !destination) return;
    const moved = lastPosRef.current ? haversineMeters(lastPosRef.current, current) : Infinity;
    const tooOld = Date.now() - lastFetchAt > 20000;
    if (!route || moved > 100 || tooOld) {
      fetchRoute();
      lastPosRef.current = current;
    }
    const t = setInterval(fetchRoute, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.lat, current?.lng, destination?.lat, destination?.lng]);

  // Pick "next" step: the step whose maneuver point is closest ahead of us.
  const nextStep = useMemo(() => {
    const leg = route?.legs?.[0];
    if (!leg?.steps?.length || !current) return null;
    let best = null;
    let bestD = Infinity;
    for (const s of leg.steps) {
      const m = s?.maneuver?.location;
      if (!Array.isArray(m) || m.length < 2) continue;
      const pt = { lng: m[0], lat: m[1] };
      const d = haversineMeters(current, pt);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }, [route, current]);

  const distToNextM = useMemo(() => {
    if (!nextStep || !current?.lat) return null;
    const m = nextStep.maneuver?.location;
    const pt = m ? { lng: m[0], lat: m[1] } : null;
    return pt ? haversineMeters(current, pt) : null;
  }, [nextStep, current]);

  const distToDestKm = useMemo(() => {
    return current && destination ? haversineMeters(current, destination) / 1000 : null;
  }, [current, destination]);

  const etaStr = useMemo(() => {
    if (distToDestKm == null) return "—";
    const mins = (distToDestKm / averageSpeedKmh) * 60;
    return minutesFmt(mins);
  }, [distToDestKm, averageSpeedKmh]);

  const arrowBearing = useMemo(() => {
    if (!current) return 0;
    if (nextStep?.maneuver?.location) {
      const loc = nextStep.maneuver.location;
      return bearingDegrees(current, { lat: loc[1], lng: loc[0] }) || 0;
    }
    if (destination) return bearingDegrees(current, destination) || 0;
    return 0;
  }, [current, nextStep, destination]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between rounded-2xl border bg-white/90 px-4 py-3 shadow">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" style={{ transform: `rotate(${arrowBearing}deg)` }} fill="currentColor">
              <path d="M12 3l4 10-4-2-4 2 4-10z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {titleFromStep(nextStep)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-600">
              Head <span className="font-medium">{compassLabel(arrowBearing)}</span>
              {distToNextM != null ? <> • Next in <span className="font-medium">{Math.max(5, Math.round(distToNextM))} m</span></> : null}
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-gray-700">
          <div>Dist: <span className="font-medium">{distToDestKm != null ? distToDestKm.toFixed(2) : "—"} km</span></div>
          <div>ETA: <span className="font-medium">{etaStr}</span></div>
        </div>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      )}
    </div>
  );
}
