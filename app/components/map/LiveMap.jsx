"use client";

import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Haversine distance in meters
export function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function FitTo({ current, destination, path }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    if (current) pts.push([current.lat, current.lng]);
    if (destination) pts.push([destination.lat, destination.lng]);
    if (path && path.length > 0) path.forEach(p => pts.push([p.lat, p.lng]));
    if (pts.length === 0) return;
    const bounds = pts.length === 1
      ? [[pts[0][0] - 0.001, pts[0][1] - 0.001], [pts[0][0] + 0.001, pts[0][1] + 0.001]]
      : pts;
    try { map.fitBounds(bounds, { padding: [24, 24] }); } catch {}
  }, [map, current, destination, path]);
  return null;
}

/** Props: current {lat,lng} | null, path [{lat,lng}], destination {lat,lng} | null */
export default function LiveMap({ current, path = [], destination = null, className = "h-72 w-full rounded-xl overflow-hidden border" }) {
  const center = current ? [current.lat, current.lng] : [53.4808, -2.2426]; // Manchester default
  return (
    <div className={className}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {path.length > 1 && (
          <Polyline positions={path.map(p => [p.lat, p.lng])} weight={4} opacity={0.7} />
        )}

        {current && <CircleMarker center={[current.lat, current.lng]} radius={8} />}
        {destination && <CircleMarker center={[destination.lat, destination.lng]} radius={8} />}

        <FitTo current={current} destination={destination} path={path} />
      </MapContainer>
    </div>
  );
}
