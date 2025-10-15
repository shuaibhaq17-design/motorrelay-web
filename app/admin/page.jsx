"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import {
  PIPELINE_ORDER,
  PIPELINE_LABELS,
  computeJobSummary,
  buildDriverLeaderboard,
  computeMembershipSummary,
  identifyStaleThreads,
  computeHealthChecks,
  buildContentUpsertPayload,
  parseMaybeJson,
  formatAge,
  summariseApplications,
  buildDealerSummary,
  buildDriverSummary,
  buildDocuments,
  fallback,
} from "./utils.mjs";

const PANELS = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "Applications" },
  { key: "conversations", label: "Conversations" },
  { key: "plans", label: "Plans & Billing" },
  { key: "system", label: "System Health" },
  { key: "content", label: "Content" },
];

const APPLICATION_TABS = [
  { key: "dealers", label: "Dealerships" },
  { key: "drivers", label: "Drivers" },
];

const STATUS_STYLES = {
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  declined: "bg-rose-100 text-rose-700 border-rose-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

const SAMPLE_JOBS = [
  {
    id: "demo-1",
    title: "MR-2025-1001",
    status: "open",
    company: "AutoHub Wembley",
    price: 95,
    pickup_postcode: "B11 1AA",
    dropoff_postcode: "SW1A 1AA",
    vehicle_make: "VW Golf",
    distance_mi: 120,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "demo-2",
    title: "MR-2025-1002",
    status: "accepted",
    company: "City Motors",
    price: 110,
    pickup_postcode: "M1 1AE",
    dropoff_postcode: "BS1 4ST",
    vehicle_make: "Ford Focus",
    distance_mi: 140,
    driver_id: "driver-demo-1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "demo-3",
    title: "MR-2025-1003",
    status: "in_transit",
    company: "GreenEV",
    price: 75,
    pickup_postcode: "LS1 1UR",
    dropoff_postcode: "HU1 1XJ",
    vehicle_make: "Tesla Model 3",
    distance_mi: 60,
    driver_id: "driver-demo-2",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "demo-4",
    title: "MR-2025-1004",
    status: "completed",
    company: "Northern Luxury",
    price: 65,
    pickup_postcode: "EH1 1BB",
    dropoff_postcode: "G1 1XQ",
    vehicle_make: "BMW 3 Series",
    distance_mi: 50,
    driver_id: "driver-demo-2",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "demo-5",
    title: "MR-2025-1005",
    status: "cancelled",
    company: "Oxford EV",
    price: 120,
    pickup_postcode: "OX1 1AA",
    dropoff_postcode: "CF10 1AA",
    vehicle_make: "Audi Q5",
    distance_mi: 130,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
];

const SAMPLE_THREADS = [
  {
    id: "demo-thread-1",
    title: "AutoHub Wembley - MR-2025-1004",
    counterpart: "AutoHub Wembley",
    job_id: "MR-2025-1004",
    last_message: "Delivered on time, thanks!",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    last_read_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "demo-thread-2",
    title: "City Motors - MR-2025-1002",
    counterpart: "City Motors",
    job_id: "MR-2025-1002",
    last_message: "Driver is en route.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    last_read_at: null,
  },
];

const PLAN_FALLBACKS = [
  { key: "bronze", name: "Bronze", price: 0, interval: "month", perks: ["Browse jobs", "Send messages", "1 seat"] },
  { key: "silver", name: "Silver", price: 19, interval: "month", perks: ["Unlimited jobs", "Priority support", "Live tracking"] },
  { key: "gold", name: "Gold", price: 39, interval: "month", perks: ["Instant payouts", "Advanced analytics", "10 seats"] },
];

const SAMPLE_DRIVER_LEADERBOARD = [
  { id: "driver-demo-1", name: "Alex Carter", completed: 24, active: 3, revenue: 2180 },
  { id: "driver-demo-2", name: "Priya Singh", completed: 18, active: 1, revenue: 1725 },
];

const SAMPLE_SUBSCRIPTIONS = [
  { id: "sub-demo-1", plan_key: "bronze", status: "active" },
  { id: "sub-demo-2", plan_key: "silver", status: "active" },
  { id: "sub-demo-3", plan_key: "silver", status: "past_due" },
  { id: "sub-demo-4", plan_key: "gold", status: "active" },
];

const CONTENT_DEFAULTS = {
  announcements: [
    "Improved job matching accuracy",
    "This week: 10% off delivery fees (Fri-Sun)",
    "Live tracking accuracy upgrades",
  ],
  legalDocs: [
    { label: "GDPR Policy", url: "#" },
    { label: "Terms & Conditions", url: "#" },
    { label: "Licensing", url: "#" },
  ],
  featureFlags: {
    newMessaging: true,
    enableFraudChecks: true,
    turboInvoicing: false,
  },
};

const short = (value, fallbackText = "-") => {
  if (!value) return fallbackText;
  const text = String(value);
  return text.length > 32 ? `${text.slice(0, 32)}...` : text;
};

export default function AdminPortalPage() {
  const [activePanel, setActivePanel] = useState("overview");
  const [activeApplicationsTab, setActiveApplicationsTab] = useState("dealers");
  const [me, setMe] = useState(null);

  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState("");

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [driverProfiles, setDriverProfiles] = useState({});

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState("");

  const [plans, setPlans] = useState(PLAN_FALLBACKS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  const [subscriptions, setSubscriptions] = useState(SAMPLE_SUBSCRIPTIONS);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [subscriptionsError, setSubscriptionsError] = useState("");

  const [contentDraft, setContentDraft] = useState(CONTENT_DEFAULTS);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentFeedback, setContentFeedback] = useState(null);

  const [busyKey, setBusyKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setMe(data?.user ?? null);
    })();

    loadDealers();
    loadDrivers();
    loadJobs();
    loadThreads();
    loadPlans();
    loadSubscriptions();
    loadContent();

    return () => {
      mounted = false;
    };
  }, []);

  async function loadDealers() {
    setDealersLoading(true);
    setDealersError("");
    try {
      const { data, error } = await supabase
        .from("dealer_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDealers(data ?? []);
    } catch (error) {
      setDealersError(error?.message ?? "Could not load dealer applications.");
      setDealers([]);
    } finally {
      setDealersLoading(false);
    }
  }

  async function loadDrivers() {
    setDriversLoading(true);
    setDriversError("");
    try {
      const { data, error } = await supabase
        .from("driver_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDrivers(data ?? []);
    } catch (error) {
      setDriversError(error?.message ?? "Could not load driver applications.");
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }

  async function loadJobs() {
    setJobsLoading(true);
    setJobsError("");
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, status, title, price, company, pickup_postcode, dropoff_postcode, vehicle_make, distance_mi, created_at, updated_at, driver_id, dealer_id"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const list = data ?? [];
      setJobs(list);
      await hydrateDriverProfiles(list);
    } catch (error) {
      setJobsError(error?.message ?? "Could not load jobs.");
      setJobs(SAMPLE_JOBS);
    } finally {
      setJobsLoading(false);
    }
  }

  async function hydrateDriverProfiles(list) {
    const ids = Array.from(
      new Set(
        list
          .map((job) => job?.driver_id)
          .filter((value) => value && !driverProfiles[value])
      )
    );
    if (!ids.length) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, email")
        .in("id", ids);
      if (error) throw error;
      if (!data) return;
      setDriverProfiles((current) => {
        const next = { ...current };
        data.forEach((profile) => {
          const { id, full_name, first_name, last_name, email } = profile ?? {};
          next[id] = {
            id,
            name:
              (full_name && String(full_name).trim()) ||
              [first_name, last_name]
                .map((part) => (part ? String(part).trim() : ""))
                .filter(Boolean)
                .join(" ") ||
              (email ?? `Driver ${String(id).slice(0, 6)}`),
            email: email ?? null,
          };
        });
        return next;
      });
    } catch (error) {
      console.warn("Could not load driver profiles", error);
    }
  }

  async function loadThreads() {
    setThreadsLoading(true);
    setThreadsError("");
    try {
      const { data, error } = await supabase
        .from("message_threads")
        .select(
          "id, title, counterpart, job_id, last_message, last_message_at, last_read_at, counterpart_last_read_at"
        )
        .order("last_message_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      setThreads(data ?? []);
    } catch (error) {
      setThreadsError(error?.message ?? "Could not load conversations.");
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }

  async function loadPlans() {
    setPlansLoading(true);
    setPlansError("");
    try {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("key, name, price, interval, perks")
        .order("price", { ascending: true });
      if (error) throw error;
      if (data?.length) setPlans(data);
    } catch (error) {
      setPlansError(error?.message ?? "Using local plan defaults.");
      setPlans(PLAN_FALLBACKS);
    } finally {
      setPlansLoading(false);
    }
  }

  async function loadSubscriptions() {
    setSubscriptionsLoading(true);
    setSubscriptionsError("");
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan_key, status")
        .limit(200);
      if (error) throw error;
      if (data) setSubscriptions(data);
    } catch (error) {
      setSubscriptionsError(error?.message ?? "Using sample subscription metrics.");
      setSubscriptions(SAMPLE_SUBSCRIPTIONS);
    } finally {
      setSubscriptionsLoading(false);
    }
  }

  async function loadContent() {
    setContentLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", ["home_updates", "legal_docs", "feature_flags"]);
      if (error) throw error;
      if (data?.length) {
        const next = { ...CONTENT_DEFAULTS };
        data.forEach((row) => {
          const value = parseMaybeJson(row?.value);
          if (row.key === "home_updates" && Array.isArray(value)) next.announcements = value;
          if (row.key === "legal_docs" && Array.isArray(value)) next.legalDocs = value;
          if (row.key === "feature_flags" && value && typeof value === "object") next.featureFlags = value;
        });
        setContentDraft(next);
      }
    } catch (error) {
      console.warn("Falling back to default content", error);
      setContentDraft(CONTENT_DEFAULTS);
    } finally {
      setContentLoading(false);
    }
  }

  async function saveContent() {
    setContentSaving(true);
    setContentFeedback(null);
    try {
      const payload = buildContentUpsertPayload(contentDraft);
      const { error } = await supabase.from("site_content").upsert(payload);
      if (error) throw error;
      setContentFeedback({ tone: "success", message: "Content saved." });
    } catch (error) {
      setContentFeedback({ tone: "error", message: error?.message ?? "Could not save content." });
    } finally {
      setContentSaving(false);
    }
  }

  async function handleDecision(kind, id, status) {
    const table = kind === "dealers" ? "dealer_applications" : "driver_applications";
    const reload = kind === "dealers" ? loadDealers : loadDrivers;

    setBusyKey(`${kind}:${id}`);
    setFeedback(null);
    try {
      const payload = {
        status,
        decided_at: new Date().toISOString(),
      };
      if (me?.id) payload.decided_by = me.id;

      const { error } = await supabase.from(table).update(payload).eq("id", id);
      if (error) throw error;

      setFeedback({ tone: "success", message: `Application ${status}.` });
      await reload();
    } catch (error) {
      setFeedback({ tone: "error", message: error?.message ?? "Update failed." });
    } finally {
      setBusyKey(null);
    }
  }

  const jobMetrics = useMemo(() => computeJobSummary(jobs.length ? jobs : SAMPLE_JOBS), [jobs]);
  const pipeline = jobMetrics.pipeline;
  const jobSummary = {
    total: jobMetrics.total,
    byStatus: jobMetrics.byStatus,
    aged: jobMetrics.aged,
  };

  const dealerSummary = useMemo(() => summariseApplications(dealers), [dealers]);
  const driverSummary = useMemo(() => summariseApplications(drivers), [drivers]);

  const driverLeaderboard = useMemo(
    () => buildDriverLeaderboard(jobs, driverProfiles, SAMPLE_DRIVER_LEADERBOARD),
    [jobs, driverProfiles]
  );

  const membershipSummary = useMemo(
    () => computeMembershipSummary(subscriptions.length ? subscriptions : SAMPLE_SUBSCRIPTIONS),
    [subscriptions]
  );

  const threadsList = threads.length ? threads : SAMPLE_THREADS;
  const staleThreads = useMemo(() => identifyStaleThreads(threadsList), [threadsList]);

  const healthChecks = useMemo(
    () =>
      computeHealthChecks({
        jobSummary,
        staleThreads,
        dealerSummary,
        driverSummary,
        membershipSummary,
      }),
    [jobSummary, staleThreads, dealerSummary, driverSummary, membershipSummary]
  );

  const planList = plans.length ? plans : PLAN_FALLBACKS;  function renderOverviewPanel() {
    const activeJobsCount =
      jobSummary.byStatus.open + jobSummary.byStatus.accepted + jobSummary.byStatus.in_transit;

    return (
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Active jobs" value={activeJobsCount} subtitle={`${jobSummary.total} total`} />
          <SummaryCard title="Jobs completed" value={jobSummary.byStatus.completed} subtitle="Last 200 records" accent="emerald" />
          <SummaryCard title="Memberships" value={membershipSummary.total} subtitle={`${Object.keys(membershipSummary.byPlan).length} plans`} accent="sky" />
          <SummaryCard title="Queues" value={dealerSummary.pending + driverSummary.pending} subtitle="Pending verifications" accent="amber" />
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Job pipeline</h2>
              {jobsError ? <InlineAlert tone="error">{jobsError}</InlineAlert> : null}
            </div>
            {jobsLoading ? <span className="text-xs text-gray-500">Loading...</span> : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {PIPELINE_ORDER.map((key) => {
              const items = pipeline[key] ?? [];
              return (
                <div key={key} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>{PIPELINE_LABELS[key]}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                      {items.length}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-gray-600">
                    {items.slice(0, 4).map((job) => (
                      <li key={job.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <div className="font-medium text-gray-800">{job.title || job.id}</div>
                        <div>
                          {short(job.pickup_postcode || job.company, "-")} ? {short(job.dropoff_postcode || job.dealer_id, "-")}
                        </div>
                      </li>
                    ))}
                    {items.length > 4 ? (
                      <li className="text-[11px] text-gray-500">+{items.length - 4} more</li>
                    ) : null}
                    {!items.length ? (
                      <li className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-5 text-center text-[11px] text-gray-400">
                        No jobs in this stage
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Driver leaderboard</h2>
              <span className="text-xs text-gray-500">Based on assigned jobs</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="pb-2 pr-4">Driver</th>
                    <th className="pb-2 pr-4 text-right">Completed</th>
                    <th className="pb-2 pr-4 text-right">Active</th>
                    <th className="pb-2 text-right">Revenue (Â£)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {driverLeaderboard.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        {row.email ? <div className="text-xs text-gray-500">{row.email}</div> : null}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-gray-900">{row.completed}</td>
                      <td className="py-2 pr-4 text-right">{row.active}</td>
                      <td className="py-2 text-right">{row.revenue.toLocaleString("en-GB", { minimumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Verification backlog</h2>
              <span className="text-xs text-gray-500">Applications awaiting a decision</span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <BacklogStat label="Dealers pending" value={dealerSummary.pending} total={dealerSummary.total} accent="emerald" />
              <BacklogStat label="Drivers pending" value={driverSummary.pending} total={driverSummary.total} accent="sky" />
              <BacklogStat label="Dealers approved" value={dealerSummary.approved} total={dealerSummary.total} accent="gray" />
              <BacklogStat label="Drivers approved" value={driverSummary.approved} total={driverSummary.total} accent="gray" />
            </dl>
            {feedback ? (
              <p className={`mt-4 text-xs ${feedback.tone === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {feedback.message}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  function renderApplicationsPanel() {
    const activeList = activeApplicationsTab === "dealers" ? dealers : drivers;
    const loading = activeApplicationsTab === "dealers" ? dealersLoading : driversLoading;
    const error = activeApplicationsTab === "dealers" ? dealersError : driversError;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Account applications</h2>
            <p className="text-sm text-gray-500">Approve or decline new MotorRelay accounts.</p>
          </div>
          <div className="inline-flex rounded-full border border-gray-200 p-1">
            {APPLICATION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveApplicationsTab(tab.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeApplicationsTab === tab.key ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {loading ? <InlineAlert tone="info">Loading applications...</InlineAlert> : null}

        <div className="grid gap-4">
          {activeList.map((application) => (
            <ApplicationCard
              key={application.id}
              kind={activeApplicationsTab}
              application={application}
              busy={busyKey === `${activeApplicationsTab}:${application.id}`}
              onDecision={handleDecision}
            />
          ))}
        </div>

        {!loading && !activeList.length ? (
          <div className="rounded-2xl border border-dashed bg-white px-6 py-12 text-center text-sm text-gray-500">
            No applications found.
          </div>
        ) : null}
      </div>
    );
  }

  function renderConversationsPanel() {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Conversation monitor</h2>
            <p className="text-sm text-gray-500">Keep an eye on escalations and unread threads.</p>
          </div>
          {threadsLoading ? <span className="text-xs text-gray-500">Loading...</span> : null}
        </div>
        {threadsError ? <InlineAlert tone="error">{threadsError}</InlineAlert> : null}
        {threadsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonRow key={idx} height="h-16" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Thread</th>
                    <th className="px-4 py-3">Last message</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {threadsList.map((thread) => {
                    const ageInfo = formatAge(thread.last_message_at);
                    const stale = ageInfo.hours >= 24;
                    const unread = Boolean(
                      thread?.last_message_at && (!thread?.last_read_at || String(thread.last_message_at) > String(thread.last_read_at))
                    );
                    return (
                      <tr key={thread.id} className={stale ? "bg-amber-50/60" : ""}>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900">{thread.title || thread.counterpart || "Conversation"}</div>
                          <div className="text-xs text-gray-500">Job {thread.job_id || "-"}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-600">
                          {thread.last_message ? short(thread.last_message) : "No messages yet."}
                          {unread ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">Unread</span> : null}
                          {stale ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">Stale</span> : null}
                        </td>
                        <td className="px-4 py-3 align-top text-gray-500">{ageInfo.label}</td>
                        <td className="px-4 py-3 align-top text-right">
                          <Link
                            className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                            href={`/messages/${encodeURIComponent(thread.id)}`}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!threadsLoading && !threadsList.length ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">No conversations yet.</div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  function renderPlansPanel() {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Membership plans</h2>
            <p className="text-sm text-gray-500">Manage plan tiers and billing signals.</p>
          </div>
          {plansError ? <InlineAlert tone="error">{plansError}</InlineAlert> : null}
          {subscriptionsError ? <InlineAlert tone="error">{subscriptionsError}</InlineAlert> : null}
        </div>

        {plansLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonRow key={idx} height="h-44" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {planList.map((plan) => (
              <div key={plan.key || plan.name} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold text-emerald-700">{plan.name}</h3>
                  <span className="text-xl font-bold">
                    {plan.price ? `Â£${Number(plan.price).toFixed(0)}` : "Free"}
                    <span className="text-xs text-gray-500">/{plan.interval || "mo"}</span>
                  </span>
                </div>
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  {(plan.perks || []).map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Subscribers: {membershipSummary.byPlan[plan.key] || 0}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Billing alerts</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>Past-due accounts: {membershipSummary.pastDue}</li>
            <li>Total active subscriptions: {membershipSummary.total}</li>
            <li>
              Plan mix: {Object.entries(membershipSummary.byPlan).map(([key, count]) => `${key}: ${count}`).join(", ") || "n/a"}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  function renderSystemPanel() {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">System health</h2>
            <p className="text-sm text-gray-500">Quick checks across core workflows.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {healthChecks.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-4 shadow-sm ${
                item.status === "warn"
                  ? "border-amber-200 bg-amber-50"
                  : item.status === "info"
                  ? "border-sky-200 bg-sky-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="text-sm font-semibold text-gray-800">{item.label}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="mt-1 text-xs text-gray-600">{item.hint}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          {jobsError ? <p className="text-rose-600">Jobs: {jobsError}</p> : null}
          {threadsError ? <p className="text-rose-600">Messaging: {threadsError}</p> : null}
          {!jobsError && !threadsError ? <p>All core services responding normally.</p> : null}
        </div>
      </div>
    );
  }

  function renderContentPanel() {
    const announcements = contentDraft.announcements ?? [];
    const legalDocs = contentDraft.legalDocs ?? [];

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Content & messaging</h2>
            <p className="text-sm text-gray-500">Control homepage banners, legal links, and feature toggles.</p>
          </div>
          {contentLoading ? <span className="text-xs text-gray-500">Loading...</span> : null}
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Homepage announcements</h3>
            <button
              type="button"
              onClick={() => setContentDraft((draft) => ({ ...draft, announcements: [...announcements, "New update"] }))}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              + Add announcement
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {announcements.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(event) => {
                    const next = announcements.slice();
                    next[index] = event.target.value;
                    setContentDraft((draft) => ({ ...draft, announcements: next }));
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setContentDraft((draft) => ({
                      ...draft,
                      announcements: announcements.filter((_, i) => i !== index),
                    }));
                  }}
                  className="rounded-xl border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                  Remove
                </button>
              </div>
            ))}
            {!announcements.length ? <p className="text-sm text-gray-500">No active announcements.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Legal links</h3>
          <div className="mt-3 space-y-3">
            {legalDocs.map((doc, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-2">
                <input
                  value={doc.label}
                  onChange={(event) => {
                    const next = legalDocs.slice();
                    next[index] = { ...next[index], label: event.target.value };
                    setContentDraft((draft) => ({ ...draft, legalDocs: next }));
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Label"
                />
                <input
                  value={doc.url}
                  onChange={(event) => {
                    const next = legalDocs.slice();
                    next[index] = { ...next[index], url: event.target.value };
                    setContentDraft((draft) => ({ ...draft, legalDocs: next }));
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="URL"
                />
              </div>
            ))}
            {!legalDocs.length ? <p className="text-sm text-gray-500">No legal links configured.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Feature flags</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {Object.entries(contentDraft.featureFlags ?? {}).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <span>{key}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => {
                    setContentDraft((draft) => ({
                      ...draft,
                      featureFlags: {
                        ...draft.featureFlags,
                        [key]: event.target.checked,
                      },
                    }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveContent}
            disabled={contentSaving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {contentSaving ? "Saving..." : "Save content"}
          </button>
          {contentFeedback ? (
            <span className={`text-sm ${contentFeedback.tone === "success" ? "text-emerald-600" : "text-rose-600"}`}>
              {contentFeedback.message}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold">Admin Portal</h1>
            <p className="text-sm text-gray-500">Operational control centre for MotorRelay.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            Back to site
          </Link>
        </div>
        <nav className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2 px-5 py-2">
            {PANELS.map((panel) => (
              <button
                key={panel.key}
                onClick={() => setActivePanel(panel.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activePanel === panel.key ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-6">
        {activePanel === "overview" && renderOverviewPanel()}
        {activePanel === "applications" && renderApplicationsPanel()}
        {activePanel === "conversations" && renderConversationsPanel()}
        {activePanel === "plans" && renderPlansPanel()}
        {activePanel === "system" && renderSystemPanel()}
        {activePanel === "content" && renderContentPanel()}
      </div>
    </main>
  );
}

function SummaryCard({ title, value, subtitle, accent = "emerald" }) {
  const accentColors = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    gray: "bg-gray-50 text-gray-600",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {subtitle ? (
        <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${accentColors[accent] || accentColors.gray}`}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function BacklogStat({ label, value, total, accent = "emerald" }) {
  const accentText = accent === "sky" ? "text-sky-600" : accent === "gray" ? "text-gray-600" : "text-emerald-600";
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accentText}`}>{value}</div>
      <div className="text-xs text-gray-500">{total} total</div>
    </div>
  );
}

function ApplicationCard({ kind, application, busy, onDecision }) {
  const statusKey = String(application?.status ?? "pending").toLowerCase();
  const summary = kind === "dealers" ? buildDealerSummary(application) : buildDriverSummary(application);
  const documents = buildDocuments(kind, application);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">{summary[0]?.value || (kind === "dealers" ? "Dealership" : "Driver")}</div>
          <div className="text-xs text-gray-500">Submitted {application?.created_at ? new Date(application.created_at).toLocaleString() : "-"}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[statusKey] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {statusKey}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.map((item) => (
          <div key={item.label}>
            <dt className="text-xs uppercase text-gray-500">{item.label}</dt>
            <dd className="text-sm text-gray-800">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        {documents.map((doc) => (
          <a
            key={doc.label}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            {doc.label}
          </a>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <DecisionButtons
          status={statusKey}
          busy={busy}
          onApprove={() => onDecision(kind, application.id, "approved")}
          onDecline={() => onDecision(kind, application.id, "declined")}
        />
        {application?.decided_at ? (
          <span className="text-xs text-gray-500">Last updated {new Date(application.decided_at).toLocaleString()}</span>
        ) : null}
      </div>
    </article>
  );
}

function DecisionButtons({ status, busy, onApprove, onDecline }) {
  const isFinal = status === "approved" || status === "declined";
  return (
    <div className="inline-flex gap-2">
      <button
        type="button"
        onClick={onApprove}
        disabled={busy || (isFinal && status === "approved")}
        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={onDecline}
        disabled={busy || (isFinal && status === "declined")}
        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}

function InlineAlert({ tone = "info", children }) {
  const styles = tone === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-sky-200 bg-sky-50 text-sky-700";
  return (
    <div className={`rounded-2xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function SkeletonRow({ height = "h-12" }) {
  return <div className={`w-full rounded-2xl bg-gray-200/70 ${height} animate-pulse`} />;
}
