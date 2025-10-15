"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function DealerJobRequestsPage() {
  const [me, setMe] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user || null;
      if (!user) {
        setError("Please sign in to view driver requests.");
        setLoading(false);
        return;
      }
      setMe(user);

      const { data, error: reqErr } = await supabase
        .from("job_requests")
        .select(
          "id, status, message, created_at, driver_id, job_id, jobs(title, pickup_postcode, dropoff_postcode, price)"
        )
        .eq("dealer_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (reqErr) {
        const msg = reqErr.message || "";
        if (msg.toLowerCase().includes("job_requests")) {
          setDisabled(true);
        } else {
          setError(reqErr.message || "Could not load driver requests.");
        }
        setRequests([]);
        setLoading(false);
        return;
      }

      setRequests(data || []);
      setDisabled(false);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const buckets = { pending: [], accepted: [], declined: [] };
    for (const req of requests) {
      const key = (req.status || "pending").toLowerCase();
      if (buckets[key]) buckets[key].push(req);
      else {
        if (!buckets.other) buckets.other = [];
        buckets.other.push(req);
      }
    }
    return buckets;
  }, [requests]);

  async function updateStatus(id, status) {
    const { error: updateErr } = await supabase
      .from("job_requests")
      .update({ status })
      .eq("id", id);
    if (updateErr) {
      alert(updateErr.message || "Could not update request.");
      return;
    }
    // Refresh view
    const { data } = await supabase
      .from("job_requests")
      .select(
        "id, status, message, created_at, driver_id, job_id, jobs(title, pickup_postcode, dropoff_postcode, price)"
      )
      .eq("dealer_id", me.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/jobs" className="text-sm text-emerald-700 hover:underline">
            ← Back to jobs
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Driver requests</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {loading ? (
          <div className="rounded-2xl border bg-white p-4">Loading requests…</div>
        ) : disabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            The <code>job_requests</code> table is not available. Add it in Supabase to enable driver requests.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">No driver requests yet.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([status, list]) => (
              list.length ? (
                <section key={status} className="rounded-2xl border bg-white p-5 shadow">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900 capitalize">{status}</h2>
                    <span className="text-xs text-gray-500">{list.length} request(s)</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {list.map((req) => (
                      <article key={req.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {req.jobs?.title || `Job ${req.job_id}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {req.jobs?.pickup_postcode || "—"} → {req.jobs?.dropoff_postcode || "—"}
                              {req.jobs?.price ? ` • ${fmtCurrency(req.jobs.price)}` : ""}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Requested {new Date(req.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Driver:</span> <span className="font-mono text-xs">{req.driver_id}</span>
                          </div>
                          <div>
                            <span className="font-medium">Message:</span> {req.message || "—"}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(req.id, 'accepted')}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(req.id, 'declined')}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            Decline
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function fmtCurrency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
