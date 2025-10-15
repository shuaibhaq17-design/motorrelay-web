// Minimal .ics generator for schedule entries
// entries: [{ title, start_at, end_at, description }]

function pad(n) { return n.toString().padStart(2, '0'); }

function toIcsDate(iso) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

export function buildIcs(entries = []) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MotorRelay//Planner//EN',
  ];
  for (const e of entries) {
    const uid = `${e.job_id || e.title || 'job'}-${Math.random().toString(16).slice(2)}@motorrelay`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${toIcsDate(e.start_at)}`);
    lines.push(`DTEND:${toIcsDate(e.end_at)}`);
    if (e.title) lines.push(`SUMMARY:${e.title.replace(/\r?\n/g, ' ')}`);
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\r?\n/g, ' ')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(filename, entries) {
  const text = buildIcs(entries);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

