"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import JobTimeline from "../../components/jobs/JobTimeline";
import RequireAuth from "../../components/auth/RequireAuth";
import RequireOnboarded from "../../components/auth/RequireOnboarded";

const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function RequestJobModal({ open, onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Confirm job request</h2>
        <p className="mt-2 text-sm text-gray-600">
          We will notify the dealership that you would like to run this job. Add an optional message below.
        </p>

        <label className="mt-4 block text-xs font-medium text-gray-500">
          Message to dealership (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="mt-1 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Share availability, vehicle details, etc."
          />
        </label>

        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note)}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send to dealership"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params?.id || ""));
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [job, setJob] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestsDisabled, setRequestsDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [advertiseInput, setAdvertiseInput] = useState("");
  const [savingAdvertise, setSavingAdvertise] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      const [{ data: userData }, jobRes, requestsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("job_requests")
          .select("id, job_id, dealer_id, driver_id, status, message, created_at")
          .eq("job_id", id)
          .order("created_at", { ascending: false }),
      ]).catch((err) => {
        console.error("load job detail", err);
        return [null, { error: err }, { error: err }];
      });

      if (cancelled) return;

      const user = userData?.user || null;
      setMe(user);

      if (jobRes?.error) {
        setError(jobRes.error.message || "Could not load job.");
        setJob(null);
        setLoading(false);
        return;
      }

      const jobRecord = jobRes?.data || null;
      setJob(jobRecord);
      setAdvertiseInput(
        jobRecord?.advertised_until
          ? new Date(jobRecord.advertised_until).toISOString().slice(0, 16)
          : ""
      );

      if (requestsRes?.error) {
        const msg = requestsRes.error.message || "";
        if (msg.toLowerCase().includes("job_requests")) {
          setRequestsDisabled(true);
          setRequests([]);
        } else {
          console.error("job_requests load", requestsRes.error);
          setRequestError("Could not load driver requests.");
        }
      } else {
        setRequests(requestsRes?.data || []);
        setRequestsDisabled(false);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = useMemo(() => job && me && job.user_id === me.id, [job, me]);
  const advertisedUntil = job?.advertised_until
    ? new Date(job.advertised_until)
    : null;
  const isExpired = advertisedUntil ? advertisedUntil.getTime() < Date.now() : false;
  const jobStatus = job?.status || "open";

  const myRequest = useMemo(() => {
    if (!me) return null;
    return requests.find((r) => r.driver_id === me.id) || null;
  }, [requests, me]);

  const canRequest =
    !loading &&
    job &&
    me &&
    !isOwner &&
    jobStatus === "open" &&
    !isExpired &&
    !requestsDisabled &&
    !myRequest;

  async function refreshRequests() {
    const { data, error } = await supabase
      .from("job_requests")
      .select("id, job_id, dealer_id, driver_id, status, message, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("job_requests refresh", error);
      return;
    }
    setRequests(data || []);
  }

  async function submitRequest(note) {
    if (!me || !job) return;
    setRequestSubmitting(true);
    setRequestError(null);
    try {
      const payload = {
        job_id: id,
        dealer_id: job.user_id,
        driver_id: me.id,
        status: "pending",
        message: note?.trim() ? note.trim() : null,
      };
      const { error } = await supabase.from("job_requests").insert(payload);
      if (error) {
        const msg = error.message || "Could not send request.";
        if (msg.toLowerCase().includes("job_requests")) {
          setRequestsDisabled(true);
          setRequestError(
            "Driver requests table is missing. Ask the dealership to enable job_requests."
          );
        } else {
          setRequestError(msg);
        }
        return;
      }
      await refreshRequests();
      setRequestModalOpen(false);
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function updateRequestStatus(requestId, status) {
    const { error } = await supabase
      .from("job_requests")
      .update({ status })
      .eq("id", requestId);
    if (error) {
      alert(error.message || "Could not update request.");
      return;
    }
    await refreshRequests();
  }

  async function saveAdvertisedUntil() {
    if (!job) return;
    setSavingAdvertise(true);
    try {
      const value = advertiseInput ? new Date(advertiseInput).toISOString() : null;
      const { error } = await supabase
        .from("jobs")
        .update({ advertised_until: value })
        .eq("id", id);
      if (error) throw error;
      setJob((prev) => (prev ? { ...prev, advertised_until: value } : prev));
    } catch (err) {
      alert(err.message || "Could not update advertised window.");
    } finally {
      setSavingAdvertise(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border bg-white p-4">Loading job…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-dvh bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border bg-white p-6">
            <h1 className="text-xl font-semibold">Job not found</h1>
            <p className="mt-1 text-gray-600">This job may have been deleted or the link is invalid.</p>
            <Link href="/jobs" className="mt-4 inline-block rounded-xl border px-4 py-2 hover:bg-gray-50">
              Back to jobs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const timeline = <JobTimeline jobId={job.id} />;

  return (
    <RequireAuth>
      <RequireOnboarded>
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/jobs" className="text-sm text-emerald-700 hover:underline">
            ← Back to jobs
          </Link>
          <span className="text-xs uppercase tracking-wider text-gray-500">{jobStatus}</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
        <section className="rounded-2xl border bg-white p-6 shadow">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{job.title || "Job"}</h1>
              <p className="text-sm text-gray-500">
                Created {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
              </p>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{fmtCurrency(job.price)}</div>
          </div>

          {advertisedUntil ? (
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${isExpired ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {isExpired ? "Advertising window has ended." : `Advertising until ${advertisedUntil.toLocaleString()}`}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No advertising window configured.
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-gray-500">Vehicle</p>
              <p className="mt-1 font-medium text-gray-900">{job.vehicle_make || "—"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-gray-500">Company</p>
              <p className="mt-1 font-medium text-gray-900">{job.company || "—"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-gray-500">Pickup → Drop-off</p>
              <p className="mt-1 font-medium text-gray-900">
                {job.pickup_postcode || "—"} → {job.dropoff_postcode || "—"}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-gray-500">Transport type</p>
              <p className="mt-1 font-medium text-gray-900">
                {job.transport_type === 'trailer' ? 'Trailer' : 'Drive-away'}
              </p>
            </div>
          </div>

          {job.notes ? (
            <div className="mt-4 rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-medium text-gray-900">Notes</div>
              <p className="mt-1 whitespace-pre-wrap">{job.notes}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {isOwner ? (
              <>
                <Link
                  href={`/jobs/${encodeURIComponent(job.id)}/edit`}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Edit job
                </Link>
                <button
                  type="button"
                  onClick={() => router.push(`/invoices/from-job/${encodeURIComponent(job.id)}`)}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Generate invoice
                </button>
              </>
            ) : null}

            {canRequest ? (
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
              >
                Pick this job
              </button>
            ) : null}

            {myRequest ? (
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                You requested this job ({myRequest.status}).
              </span>
            ) : null}

            {requestsDisabled ? (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                Driver requests are not configured yet.
              </span>
            ) : null}

            {isExpired && !isOwner ? (
              <span className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                This job is no longer accepting requests.
              </span>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Job timeline</h2>
          <div className="mt-3">{timeline}</div>
        </section>

        {isOwner ? (
          <section className="rounded-2xl border bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Advertising window</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose how long this job stays visible to drivers.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-gray-500">
                Advertise until
                <input
                  type="datetime-local"
                  value={advertiseInput}
                  onChange={(e) => setAdvertiseInput(e.target.value)}
                  className="mt-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <button
                type="button"
                onClick={saveAdvertisedUntil}
                disabled={savingAdvertise}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingAdvertise ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
        ) : null}

        {isOwner ? (
          <section className="rounded-2xl border bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Driver requests</h2>
            {requestsDisabled ? (
              <p className="mt-2 text-sm text-gray-500">
                Enable a <code>job_requests</code> table in Supabase to collect driver interest.
              </p>
            ) : requests.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No driver has requested this job yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Driver ID</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Message</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Requested</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{req.driver_id}</td>
                        <td className="px-3 py-2 capitalize text-gray-700">{req.status}</td>
                        <td className="px-3 py-2 text-gray-600">{req.message || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{new Date(req.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'accepted')}
                              className="rounded-lg border px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'declined')}
                              className="rounded-lg border px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                            >
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <RequestJobModal
        open={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setRequestError(null);
        }}
        onSubmit={submitRequest}
        submitting={requestSubmitting}
        error={requestError}
      />
    </main>
      </RequireOnboarded>
    </RequireAuth>
  );
}
