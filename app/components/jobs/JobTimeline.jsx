"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const describeEvent = (row) =>
  row?.type ||
  row?.status ||
  row?.action ||
  row?.description ||
  row?.message ||
  "Update";

const eventTimestamp = (row) => row?.at || row?.created_at || row?.inserted_at || row?.timestamp || null;

const sortRows = (list) => {
  return [...(list || [])].sort((a, b) => {
    const ta = eventTimestamp(a) ? new Date(eventTimestamp(a)).getTime() : 0;
    const tb = eventTimestamp(b) ? new Date(eventTimestamp(b)).getTime() : 0;
    return ta - tb;
  });
};

export default function JobTimeline({ jobId }) {
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [timelineDisabled, setTimelineDisabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let channel = null;

    async function loadInitial() {
      try {
        const { data, error } = await supabase
          .from("job_events")
          .select("id, job_id, type, status, action, description, message, at, created_at, inserted_at")
          .eq("job_id", jobId);

        if (!isMounted) return;

        if (error) {
          const msg = error.message || "";
          if (msg.toLowerCase().includes('column "event"')) {
            console.warn("job_events: timeline disabled because the 'event' column is missing.");
            setTimelineDisabled(true);
            setRows([]);
            setLoadError(null);
            return;
          }

          console.error("job_events fetch failed", error);
          setLoadError(msg || "Could not load job history");
          setRows([]);
          return;
        }

        setRows(sortRows(data));
        setLoadError(null);

        channel = supabase
          .channel(`job-events-${jobId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "job_events", filter: `job_id=eq.${jobId}` },
            (payload) => setRows((cur) => sortRows([...(cur || []), payload.new]))
          );

        channel.subscribe();
      } catch (err) {
        if (!isMounted) return;
        console.error("job_events unexpected error", err);
        setLoadError("Could not load job history");
        setRows([]);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [jobId]);

  if (timelineDisabled) {
    return <div className="text-sm text-gray-500">Timeline data unavailable.</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Unable to load the job timeline right now.
      </div>
    );
  }

  if (!rows.length) {
    return <div className="text-sm text-gray-500">No events recorded yet.</div>;
  }

  return (
    <ol className="space-y-1 text-sm text-gray-700">
      {rows.map((row) => {
        const label = describeEvent(row);
        const ts = eventTimestamp(row);
        const when = ts ? new Date(ts).toLocaleString() : "Just now";

        return (
          <li key={row.id}>
            <b>{label}</b> - <span className="text-gray-500">{when}</span>
          </li>
        );
      })}
    </ol>
  );
}
