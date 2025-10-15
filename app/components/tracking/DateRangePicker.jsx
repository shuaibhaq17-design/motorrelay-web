"use client";

export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500">Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange?.(e.target.value)}
          className="w-44 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500">End date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange?.(e.target.value)}
          className="w-44 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}
