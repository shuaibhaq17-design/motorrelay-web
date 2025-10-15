"use client";

export default function ExportCsvButton({ rows = [], filename = "export.csv", className = "", children }) {
  function toCsvValue(v) {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function handleClick() {
    const headers = [
      "id","thread_id","job_id",
      "started_at","ended_at","duration_seconds","distance_km","created_at"
    ];
    const lines = [headers.join(",")];

    for (const r of rows) {
      const sec = typeof r.duration_seconds === "number"
        ? r.duration_seconds
        : r.started_at && r.ended_at
          ? Math.max(0, Math.round((new Date(r.ended_at) - new Date(r.started_at)) / 1000))
          : "";
      const line = [
        r.id, r.thread_id, r.job_id,
        r.started_at, r.ended_at, sec, r.distance_km, r.created_at
      ].map(toCsvValue).join(",");
      lines.push(line);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => {
      URL.revokeObjectURL(url);
      a.remove();
    });
  }

  return (
    <button onClick={handleClick} className={className}>
      {children || "Export CSV"}
    </button>
  );
}
