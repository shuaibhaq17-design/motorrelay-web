"use client";

import Link from "next/link";

function timeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function ThreadTile({ thread }) {
  const {
    id,
    title,
    counterpart,
    job_id,
    last_message,
    last_message_at,
    last_read_at,
    archived_at,
  } = thread;

  const displayTitle = title || counterpart || "Conversation";
  const unread =
    last_message_at && (!last_read_at || new Date(last_message_at) > new Date(last_read_at));

  return (
    <Link
      href={`/messages/${encodeURIComponent(id)}`}
      className="group block rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition-all"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {displayTitle}
            {job_id ? <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-700">{job_id}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          <span className="text-[11px] text-gray-500">{timeAgo(last_message_at)}</span>
        </div>
      </div>

      <div className="line-clamp-2 text-sm text-gray-600">
        {last_message || <span className="text-gray-400">No messages yet</span>}
      </div>

      {archived_at && (
        <div className="mt-3 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          Archived
        </div>
      )}
    </Link>
  );
}
