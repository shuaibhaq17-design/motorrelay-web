"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../components/auth/RequireAuth";
import RequireOnboarded from "../components/auth/RequireOnboarded";
import { autoSchedule } from "../components/planner/AutoScheduler";
import { hasAdminAccess } from "../components/auth/RequireAdmin";
import { downloadIcs } from "../components/planner/ics";

const CURRENT_STATUSES = ["accepted", "collected", "in_transit", "pending"]; // jobs to plan

function fmtDay(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const START_HOUR = 8;
const END_HOUR = 20; // exclusive
const SLOT_MINUTES = 30;

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMinutes(iso, minutes) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function within(iso, weekStart) {
  const start = new Date(iso);
  const end = new Date(weekStart);
  const weekEnd = new Date(end);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return start >= end && start < weekEnd;
}

export default function PlannerPage() {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [dragState, setDragState] = useState(null); // { job_id, type: 'move'|'resize-top'|'resize-bottom', start_at, end_at, dayIndex }
  const gridRef = useRef(null);
  const [planKey, setPlanKey] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewUserId, setViewUserId] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login?redirect=/planner"; return; }
      if (!on) return;
      setMe(user);
      setIsAdmin(hasAdminAccess(user));
      setViewUserId(user.id);

      // Only drivers on Gold plan get planner
      const role = user?.user_metadata?.role || '';
      if (!hasAdminAccess(user) && role !== 'driver') {
        setLoading(false);
        setError('Planner is available for drivers only.');
        return;
      }

      // Determine membership plan (Supabase first, then localStorage)
      let key = null;
      try {
        const { data: sub } = await supabase
          .from('user_membership')
          .select('plan_key')
          .eq('user_id', user.id)
          .maybeSingle();
        key = sub?.plan_key || null;
      } catch {}
      if (!key && typeof window !== 'undefined') {
        try { key = (window.localStorage.getItem('mr_plan') || '').toLowerCase(); } catch {}
      }
      setPlanKey(key || null);
      if (!hasAdminAccess(user) && (key || '').toLowerCase() !== 'gold') {
        setLoading(false);
        setError('Planner is available on the Gold plan.');
        return;
      }

      // Load my current jobs
      const targetUser = hasAdminAccess(user) && viewUserId ? viewUserId : user.id;

      const { data: jobRows } = await supabase
        .from("jobs")
        .select("id, title, company, vehicle_make, distance_mi, status, created_at")
        .eq("user_id", targetUser);
      const current = (jobRows || []).filter((j) => CURRENT_STATUSES.includes(j.status));
      setJobs(current);

      // Load schedule entries if table exists; else fallback to localStorage
      let scheduled = [];
      try {
        const { data, error } = await supabase
          .from("driver_schedule")
          .select("job_id, start_at, end_at, note")
          .eq("user_id", targetUser)
          .order("start_at", { ascending: true });
        if (!error && data) scheduled = data;
      } catch {}
      if (!scheduled.length && typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(`mr_schedule_${targetUser}`);
          if (raw) scheduled = JSON.parse(raw) || [];
        } catch {}
      }
      setEntries(scheduled);
      setLoading(false);
    })();
    return () => { on = false; };
  }, [viewUserId]);

  const unscheduledJobs = useMemo(() => {
    const s = new Set(entries.map((e) => e.job_id));
    return jobs.filter((j) => !s.has(j.id));
  }, [jobs, entries]);

  const weekEntries = useMemo(() => entries.filter((e) => within(e.start_at, weekStart)), [entries, weekStart]);

  function setEntry(job_id, updater) {
    setEntries((cur) => cur.map((e) => (e.job_id === job_id ? { ...e, ...updater(e) } : e)));
  }

  function addManual(jobId) {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    setEntries((cur) => [...cur, { job_id: jobId, start_at: start.toISOString(), end_at: end.toISOString(), note: null }]);
  }

  async function save() {
    if (!me) return;
    setSaving(true);
    setError("");
    try {
      let persisted = false;
      // Try Supabase first
      try {
        // Upsert by (user_id, job_id)
        const targetUser = isAdmin && viewUserId ? viewUserId : me.id;
        const payload = entries.map((e) => ({ user_id: targetUser, ...e }));
        const { error } = await supabase.from("driver_schedule").upsert(payload, { onConflict: "user_id,job_id" });
        if (!error) persisted = true;
      } catch {}
      if (!persisted && typeof window !== "undefined") {
        const targetUser = isAdmin && viewUserId ? viewUserId : me.id;
        window.localStorage.setItem(`mr_schedule_${targetUser}`, JSON.stringify(entries));
      }
      window.dispatchEvent(new CustomEvent("mr-toast", { detail: { title: "Planner saved", message: persisted ? "Saved to cloud" : "Saved locally" } }));
    } catch (e) {
      setError(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function runAuto() {
    const next = autoSchedule(jobs, entries);
    setEntries(next);
  }

  function addSampleJobs() {
    const samples = [
      { id: crypto.randomUUID(), title: 'MR-TEST-1001', company: 'City Motors', vehicle_make: 'Ford Focus', distance_mi: 120, status: 'accepted' },
      { id: crypto.randomUUID(), title: 'MR-TEST-1002', company: 'AutoHub Wembley', vehicle_make: 'VW Golf', distance_mi: 60, status: 'in_transit' },
      { id: crypto.randomUUID(), title: 'MR-TEST-1003', company: 'Northern Luxury', vehicle_make: 'BMW 3 Series', distance_mi: 80, status: 'pending' },
      { id: crypto.randomUUID(), title: 'MR-TEST-1004', company: 'Oxford EV', vehicle_make: 'Tesla Model 3', distance_mi: 150, status: 'accepted' },
    ];
    setJobs(samples);
    // Clear current entries and auto-schedule
    const next = autoSchedule(samples, []);
    setEntries(next);
  }

  function shiftWeek(delta) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  }

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const slotsPerHour = 60 / SLOT_MINUTES;
  const totalSlots = (END_HOUR - START_HOUR) * slotsPerHour;

  function slotToIso(dayIndex, slotIndex) {
    const base = new Date(days[dayIndex]);
    base.setHours(START_HOUR, 0, 0, 0);
    base.setMinutes(base.getMinutes() + slotIndex * SLOT_MINUTES);
    return base.toISOString();
  }

  function computePlacement(e) {
    const start = new Date(e.start_at);
    const dayIndex = Math.floor((start - days[0]) / (1000 * 60 * 60 * 24));
    const minutesFromStart = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const startSlot = Math.max(0, Math.floor(minutesFromStart / SLOT_MINUTES));
    const end = new Date(e.end_at);
    const minutesEnd = (end.getHours() - START_HOUR) * 60 + end.getMinutes();
    const endSlot = Math.min(totalSlots, Math.ceil(Math.max(0, minutesEnd) / SLOT_MINUTES));
    const span = Math.max(1, endSlot - startSlot);
    return { dayIndex, startSlot, span };
  }

  function beginDrag(e, entry, type) {
    e.preventDefault();
    const { dayIndex } = computePlacement(entry);
    setDragState({ job_id: entry.job_id, type, start_at: entry.start_at, end_at: entry.end_at, dayIndex });
  }

  function onGridMouseMove(ev) {
    if (!dragState) return;
    const { job_id, type, dayIndex } = dragState;
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const columnWidth = rect.width / 7;
    const rowHeight = rect.height / totalSlots;
    let col = Math.min(6, Math.max(0, Math.floor(x / columnWidth)));
    let row = Math.min(totalSlots - 1, Math.max(0, Math.floor(y / rowHeight)));

    // constrain within the original day for move/resize simplicity
    col = dayIndex;

    if (type === 'move') {
      const newStart = slotToIso(col, row);
      const durMin = (new Date(dragState.end_at) - new Date(dragState.start_at)) / 60000;
      const newEnd = addMinutes(newStart, Math.max(SLOT_MINUTES, Math.round(durMin / SLOT_MINUTES) * SLOT_MINUTES));
      setEntry(job_id, () => ({ start_at: newStart, end_at: newEnd }));
    } else if (type === 'resize-top') {
      const newStart = slotToIso(col, row);
      setEntry(job_id, (prev) => ({ start_at: newStart, end_at: prev.end_at }));
    } else if (type === 'resize-bottom') {
      const newEnd = slotToIso(col, Math.max(row + 1, 1));
      setEntry(job_id, (prev) => ({ start_at: prev.start_at, end_at: newEnd }));
    }
  }

  function onGridMouseUp() { setDragState(null); }

  return (
    <RequireAuth>
      <RequireOnboarded>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Planner</h1>
            <div className="flex gap-2">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    value={viewUserId || ''}
                    onChange={(e) => setViewUserId(e.target.value.trim())}
                    placeholder="Enter user_id to view"
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{ width: 260 }}
                  />
                  <button onClick={() => setWeekStart(startOfWeek())} className="rounded-xl border px-3 py-2 text-sm">Load</button>
                </div>
              ) : null}
              <button onClick={() => shiftWeek(-1)} className="rounded-xl border px-3 py-2 text-sm">Prev week</button>
              <button onClick={() => setWeekStart(startOfWeek())} className="rounded-xl border px-3 py-2 text-sm">This week</button>
              <button onClick={() => shiftWeek(1)} className="rounded-xl border px-3 py-2 text-sm">Next week</button>
              <button onClick={runAuto} className="rounded-xl border px-3 py-2 text-sm">Auto-schedule</button>
              <button onClick={addSampleJobs} className="rounded-xl border px-3 py-2 text-sm">Add sample jobs</button>
              <button onClick={() => {
                const enriched = weekEntries.map((e) => {
                  const job = jobs.find(j => j.id === e.job_id) || {};
                  return { ...e, title: job.title || job.company || job.vehicle_make || e.job_id, description: `Job ${e.job_id}` };
                });
                downloadIcs('motorrelay-planner.ics', enriched);
              }} className="rounded-xl border px-3 py-2 text-sm">Export .ics</button>
              <button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-4">Loading…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-5">
              {/* Left: Unscheduled jobs */}
              <div className="md:col-span-2 rounded-2xl border bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">Unscheduled jobs ({unscheduledJobs.length})</div>
                {unscheduledJobs.length === 0 ? (
                  <div className="text-sm text-gray-600">All current jobs are scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {unscheduledJobs.map((j) => (
                      <div key={j.id} className="flex items-center justify-between rounded-xl border p-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">{j.title || j.company || j.vehicle_make || j.id}</div>
                          <div className="text-xs text-gray-500">{j.status} · {Number(j.distance_mi || 0)} mi</div>
                        </div>
                        <button onClick={() => addManual(j.id)} className="rounded-lg border px-2 py-1 text-xs">Add</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Weekly grid calendar */}
              <div className="md:col-span-3 rounded-2xl border bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">This week</div>
                {/* Day headers above the grid */}
                <div className="grid mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {days.map((d, i) => (
                    <div key={i} className="text-center text-xs text-gray-600">
                      {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  ))}
                </div>
                <div
                  ref={gridRef}
                  onMouseMove={onGridMouseMove}
                  onMouseUp={onGridMouseUp}
                  className="relative grid"
                  style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${totalSlots}, minmax(18px, 1fr))`, gap: '2px', height: '560px' }}
                >
                  {/* Slots background */}
                  {Array.from({ length: 7 }).map((_, col) => (
                    <div key={col} className="contents">
                      {Array.from({ length: totalSlots }).map((__, row) => (
                        <div key={row} className="border border-gray-100" style={{ gridColumn: col + 1, gridRow: row + 1 }} />
                      ))}
                    </div>
                  ))}

                  {/* Entries */}
                  {weekEntries.map((e) => {
                    const { dayIndex, startSlot, span } = computePlacement(e);
                    const job = jobs.find((j) => j.id === e.job_id) || {};
                    // conflict detection
                    const overlaps = weekEntries.filter((x) => x !== e).some((x) => {
                      const a1 = new Date(e.start_at).getTime();
                      const a2 = new Date(e.end_at).getTime();
                      const b1 = new Date(x.start_at).getTime();
                      const b2 = new Date(x.end_at).getTime();
                      return a1 < b2 && b1 < a2 && new Date(e.start_at).getDay() === new Date(x.start_at).getDay();
                    });
                    return (
                      <div
                        key={`${e.job_id}-${e.start_at}`}
                        className={`relative rounded-md p-1 text-xs ${overlaps ? 'bg-amber-200 border border-amber-400' : 'bg-emerald-100 border border-emerald-300'}`}
                        style={{ gridColumn: dayIndex + 1, gridRow: `${startSlot + 1} / span ${span}` }}
                        onMouseDown={(evt) => beginDrag(evt, e, 'move')}
                        title={`${job.title || job.company || job.vehicle_make || e.job_id}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0 truncate font-medium text-gray-800">{job.title || job.company || job.vehicle_make || e.job_id}</div>
                          <button
                            className="rounded bg-white/70 px-1 text-[10px]"
                            onClick={(ev) => { ev.stopPropagation(); setEntries((cur) => cur.filter((x) => !(x.job_id === e.job_id && x.start_at === e.start_at))); }}
                          >x</button>
                        </div>
                        <div className="text-[10px] text-gray-700">
                          {fmtTime(e.start_at)} - {fmtTime(e.end_at)}
                        </div>
                        <div className="pointer-events-auto absolute -top-1 left-1 right-1 flex justify-between">
                          <span className="h-1 w-6 cursor-n-resize rounded bg-emerald-400" onMouseDown={(evt) => beginDrag(evt, e, 'resize-top')} />
                          <span className="h-1 w-6 cursor-s-resize rounded bg-emerald-400" onMouseDown={(evt) => beginDrag(evt, e, 'resize-bottom')} />
                        </div>
                        {job.pickup_postcode || job.dropoff_postcode ? (
                          <div className="mt-1 text-[10px] text-gray-600">
                            {job.pickup_postcode || '—'} → {job.dropoff_postcode || '—'}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
