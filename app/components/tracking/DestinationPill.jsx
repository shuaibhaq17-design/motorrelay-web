"use client";

import { useState, useMemo } from "react";
import DestinationModal from "./DestinationModal";

function extractUkPostcode(s) {
  // Matches: A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, A9A 9AA, AA9A 9AA (space optional in input)
  if (!s) return null;
  const m = String(s).toUpperCase().match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})\b/);
  return m ? `${m[1]} ${m[2]}` : null;
}

export default function DestinationPill({ thread, onChanged }) {
  const [open, setOpen] = useState(false);

  const hasDest = thread?.dest_lat != null && thread?.dest_lng != null;

  const pillText = useMemo(() => {
    const pc = extractUkPostcode(thread?.dest_label || "");
    if (pc) return pc;
    return hasDest ? "Destination set" : "Set destination";
  }, [thread?.dest_label, hasDest]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ${
          hasDest
            ? "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100"
            : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100"
        }`}
        title={hasDest ? "Edit destination" : "Set destination"}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        <span className="truncate max-w-[8rem]">{pillText}</span>
      </button>

      {open && (
        <DestinationModal
          threadId={thread?.id}
          initialLabel={thread?.dest_label || ""}
          initialLat={typeof thread?.dest_lat === "number" ? thread.dest_lat : ""}
          initialLng={typeof thread?.dest_lng === "number" ? thread.dest_lng : ""}
          onClose={() => setOpen(false)}
          onSaved={(row) => { setOpen(false); onChanged?.(row); }}
          onCleared={(row) => { setOpen(false); onChanged?.(row); }}
        />
      )}
    </>
  );
}
