"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Portal from "../Portal"; // <-- fixed path (one level up)

export default function DestinationModal({
  threadId,
  initialLabel = "",
  initialLat = "",
  initialLng = "",
  onSaved,
  onCleared,
  onClose,
}) {
  const [label, setLabel] = useState(initialLabel);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [addr, setAddr] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function save() {
    try {
      setBusy(true);
      const p_lat = lat === "" ? null : Number(lat);
      const p_lng = lng === "" ? null : Number(lng);
      const { data, error } = await supabase.rpc("fn_set_thread_destination", {
        p_thread_id: String(threadId),
        p_label: label || null,
        p_lat,
        p_lng,
      });
      if (error) throw error;
      onSaved?.(data);
    } catch (e) {
      alert(e?.message || "Failed to save destination");
    } finally {
      setBusy(false);
    }
  }

  async function clearDest() {
    try {
      setBusy(true);
      const { data, error } = await supabase.rpc("fn_set_thread_destination", {
        p_thread_id: String(threadId),
        p_label: null,
        p_lat: null,
        p_lng: null,
      });
      if (error) throw error;
      onCleared?.(data);
    } catch (e) {
      alert(e?.message || "Failed to clear destination");
    } finally {
      setBusy(false);
    }
  }

  async function searchAddress() {
    try {
      setBusy(true);
      setNote("Searching…");
      setResults([]);
      const q = addr.trim();
      if (!q) return;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "motorrelay-dev" } });
      const json = await res.json();
      setResults(Array.isArray(json) ? json : []);
      setNote((json?.length ?? 0) === 0 ? "No matches found." : "");
    } catch {
      setNote("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function useResult(r) {
    setLabel(r.display_name || label);
    setLat(Number(r.lat));
    setLng(Number(r.lon));
    setResults([]);
  }

  return (
    <Portal>
      {/* Click-through blocker */}
      <div className="fixed inset-0 z-[1000] bg-black/30" onClick={onClose} />

      {/* Modal card */}
      <div className="fixed left-1/2 top-8 z-[1001] -translate-x-1/2">
        <div className="w-[92vw] max-w-lg rounded-2xl border bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">Destination</h3>
            <button onClick={onClose} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
              Close
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] text-gray-500">Label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Dealership HQ"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Latitude</label>
                <input
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="53.4808"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Longitude</label>
                <input
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-2.2426"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-3">
              <label className="mb-1 block text-[11px] text-gray-500">Find by address (optional)</label>
              <div className="flex items-center gap-2">
                <input
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="Type an address or postcode…"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={searchAddress}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Search
                </button>
              </div>

              {note && <div className="mt-2 text-[11px] text-gray-500">{note}</div>}

              {results.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {results.map((r) => (
                    <li key={`${r.osm_type}-${r.osm_id}`} className="rounded-lg border bg-white p-2">
                      <div className="text-xs font-medium">{r.display_name}</div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {Number(r.lat).toFixed(5)}, {Number(r.lon).toFixed(5)}
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => useResult(r)}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Use this location
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={clearDest}
              disabled={busy}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Clear destination
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
