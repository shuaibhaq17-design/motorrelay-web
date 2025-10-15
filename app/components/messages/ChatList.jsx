"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function ChatList({ threads }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | priority | archived
  // Archived not implemented in mock; wired for future.

  const filtered = useMemo(() => {
    let list = threads;
    if (filter === "priority") list = list.filter(t => t.priority);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.counterpart.toLowerCase().includes(q)
      );
    }
    // Sort newest first by updatedAt
    return [...list].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [threads, query, filter]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Filters */}
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Search by job or company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex overflow-hidden rounded-xl border border-gray-200">
          {["all", "priority"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm ${
                filter === f
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {f === "all" ? "All" : "Priority"}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex flex-col">
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/messages/${t.id}`}
            className="tile flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-soft transition"
          >
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center font-semibold text-emerald-700">
              {t.counterpart.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{t.title}</p>
                {t.priority && (
                  <span className="badge badge-green text-xs rounded-md px-2 py-0.5">
                    Priority
                  </span>
                )}
                {t.unread > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                    {t.unread}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">
                {t.counterpart} • {t.lastMessage}
              </p>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
            No conversations match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
