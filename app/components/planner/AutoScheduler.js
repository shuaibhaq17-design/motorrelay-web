// Simple auto-scheduler: assigns jobs to the next available slot.
// Duration estimate: distance_mi / 35 mph + 30 min buffer, min 1h.

function estimateHours(job) {
  const d = Number(job?.distance_mi || 0);
  const hoursDrive = d > 0 ? d / 35 : 1;
  const buffer = 0.5;
  const h = Math.max(1, hoursDrive + buffer);
  return Math.min(h, 10); // cap to 10h defensively
}

function toIso(date) {
  return new Date(date).toISOString();
}

export function autoSchedule(jobs = [], existingEntries = []) {
  const entries = [...existingEntries];
  const scheduledJobIds = new Set(entries.map((e) => e.job_id));
  const queue = jobs.filter((j) => !scheduledJobIds.has(j.id));
  if (!queue.length) return entries;

  // Start from next hour, today or next business day at 9am
  const now = new Date();
  let cursor = new Date(now);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(Math.max(9, now.getHours() + 1));

  for (const job of queue) {
    const hours = estimateHours(job);
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setHours(end.getHours() + Math.ceil(hours));

    // If end spills past 18:00, move to next day 9am
    if (end.getHours() > 18) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      const start2 = next;
      const end2 = new Date(start2);
      end2.setHours(end2.getHours() + Math.ceil(hours));
      entries.push({ job_id: job.id, start_at: toIso(start2), end_at: toIso(end2), note: null });
      cursor = new Date(end2);
    } else {
      entries.push({ job_id: job.id, start_at: toIso(start), end_at: toIso(end), note: null });
      cursor = new Date(end);
    }
  }

  return entries;
}

