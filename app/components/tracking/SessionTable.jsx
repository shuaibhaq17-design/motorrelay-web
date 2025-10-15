"use client";

import Link from "next/link";

export default function SessionTable({ sessions = [], loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border p-4">
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-gray-600">
        No sessions found for this range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-700">
            <Th>Started</Th>
            <Th>Ended</Th>
            <Th>Duration</Th>
            <Th>Distance</Th>
            <Th>Thread</Th>
            <Th>Job</Th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-t">
              <Td>{fmtDateTime(s.started_at)}</Td>
              <Td>{s.ended_at ? fmtDateTime(s.ended_at) : <span className="italic text-gray-500">In progress</span>}</Td>
              <Td>{fmtDuration(s)}</Td>
              <Td>{fmtDistance(s.distance_km)}</Td>
              <Td>
                {s.thread_id ? (
                  <Link
                    href={`/messages/${encodeURIComponent(s.thread_id)}`}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800 hover:bg-gray-200"
                  >
                    {shortId(s.thread_id)}
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
              <Td>{s.job_id || <span className="text-gray-400">—</span>}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    // Local date/time (Europe/London timezone user)
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtDuration(s) {
  const sec = typeof s.duration_seconds === "number"
    ? s.duration_seconds
    : s.started_at && s.ended_at
      ? Math.max(0, (new Date(s.ended_at) - new Date(s.started_at)) / 1000)
      : 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = Math.floor(sec % 60);
  const hh = h > 0 ? `${h}:` : "";
  return `${hh}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function fmtDistance(km) {
  if (km == null) return "—";
  const n = Number(km);
  if (Number.isNaN(n)) return "—";
  if (n < 1) return `${(n * 1000).toFixed(0)} m`;
  return `${n.toFixed(2)} km`;
}

function shortId(s) {
  if (!s) return "—";
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}
