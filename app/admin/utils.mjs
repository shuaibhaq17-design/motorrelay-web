export const PIPELINE_ORDER = ["open", "accepted", "in_transit", "completed", "cancelled"];
export const PIPELINE_LABELS = {
  open: "Open",
  accepted: "Assigned",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

const DAY_MS = 1000 * 60 * 60 * 24;

export function normaliseStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (["open", "posted", "available", "pending_offer"].includes(status)) return "open";
  if (["accepted", "assigned", "active"].includes(status)) return "accepted";
  if (["in_transit", "en_route", "pending", "collected", "on_route"].includes(status)) return "in_transit";
  if (["completed", "delivered", "closed", "done"].includes(status)) return "completed";
  if (["cancelled", "canceled", "void", "failed"].includes(status)) return "cancelled";
  return "open";
}

export function groupJobsByStatus(jobs = []) {
  const buckets = Object.fromEntries(PIPELINE_ORDER.map((key) => [key, []]));
  for (const job of jobs) {
    const key = normaliseStatus(job?.status);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(job);
  }
  return buckets;
}

export function computeJobSummary(jobs = [], now = Date.now()) {
  const referenceMs = now instanceof Date ? now.getTime() : Number(now);
  const pipeline = groupJobsByStatus(jobs);
  const byStatus = PIPELINE_ORDER.reduce((acc, key) => {
    acc[key] = pipeline[key]?.length ?? 0;
    return acc;
  }, {});

  const aged = jobs.filter((job) => {
    const timestamp = job?.updated_at ?? job?.created_at;
    if (!timestamp) return false;
    const jobMs = new Date(timestamp).getTime();
    return Number.isFinite(jobMs) && jobMs < referenceMs - 2 * DAY_MS;
  }).length;

  return {
    pipeline,
    total: jobs.length,
    byStatus,
    aged,
  };
}

export function buildDriverLeaderboard(jobs = [], profiles = {}, fallback = []) {
  const summary = new Map();

  for (const job of jobs) {
    const driverId = job?.assigned_driver_id ?? job?.driver_id;
    if (!driverId) continue;

    const key = normaliseStatus(job?.status);
    const price = Number(job?.price ?? 0);
    const entry = summary.get(driverId) ?? { id: driverId, completed: 0, active: 0, revenue: 0 };

    if (key === "completed") entry.completed += 1;
    else if (key === "accepted" || key === "in_transit") entry.active += 1;

    if (Number.isFinite(price)) entry.revenue += price;

    summary.set(driverId, entry);
  }

  const rows = Array.from(summary.values()).map((row) => {
    const profile = profiles[row.id] ?? {};
    const nameCandidate =
      typeof profile.name === "string" && profile.name.trim().length
        ? profile.name
        : typeof profile.full_name === "string" && profile.full_name.trim().length
        ? profile.full_name
        : typeof profile.email === "string" && profile.email.trim().length
        ? profile.email
        : `Driver ${String(row.id).slice(0, 6)}`;

    return {
      ...row,
      name: nameCandidate,
      email: profile.email ?? null,
    };
  });

  if (rows.length > 0) {
    return rows
      .sort((a, b) => b.completed - a.completed || b.revenue - a.revenue)
      .slice(0, 8);
  }

  if (fallback.length > 0) return fallback;

  return [
    { id: "driver-sample-1", name: "Alex Carter", completed: 0, active: 0, revenue: 0 },
  ];
}

export function computeMembershipSummary(subscriptions = []) {
  const byPlan = subscriptions.reduce((acc, row) => {
    const key = row?.plan_key ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const pastDue = subscriptions.filter(
    (row) => String(row?.status ?? "").toLowerCase() === "past_due"
  ).length;

  return {
    total: subscriptions.length,
    byPlan,
    pastDue,
  };
}

export function identifyStaleThreads(threads = [], now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  return threads.filter((thread) => {
    const timestamp = thread?.last_message_at;
    if (!timestamp) return false;
    const messageMs = new Date(timestamp).getTime();
    return Number.isFinite(messageMs) && nowMs - messageMs > DAY_MS;
  });
}

export function computeHealthChecks({
  jobSummary,
  staleThreads,
  dealerSummary,
  driverSummary,
  membershipSummary,
}) {
  const staleCount = staleThreads?.length ?? 0;
  const pendingDealer = dealerSummary?.pending ?? 0;
  const pendingDriver = driverSummary?.pending ?? 0;
  const agedJobs = jobSummary?.aged ?? 0;
  const pastDue = membershipSummary?.pastDue ?? 0;

  return [
    {
      label: "Open jobs > 48h",
      value: agedJobs,
      status: agedJobs ? "warn" : "ok",
      hint: agedJobs ? "Review job assignments." : "All recent jobs are healthy.",
    },
    {
      label: "Stale conversations",
      value: staleCount,
      status: staleCount ? "warn" : "ok",
      hint: staleCount ? "Reach out to unblock." : "All conversations are fresh.",
    },
    {
      label: "Pending dealer reviews",
      value: pendingDealer,
      status: pendingDealer > 5 ? "warn" : pendingDealer ? "info" : "ok",
      hint: pendingDealer ? "Approve or decline pending dealers." : "All dealer applications processed.",
    },
    {
      label: "Pending driver verifications",
      value: pendingDriver,
      status: pendingDriver > 10 ? "warn" : pendingDriver ? "info" : "ok",
      hint: pendingDriver ? "Keep verification queue moving." : "Driver queue clear.",
    },
    {
      label: "Past-due memberships",
      value: pastDue,
      status: pastDue ? "warn" : "ok",
      hint: pastDue ? "Follow up with billing." : "All memberships current.",
    },
  ];
}

export function buildContentUpsertPayload(draft, timestamp = new Date()) {
  const iso = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
  const announcements = Array.isArray(draft?.announcements) ? draft.announcements : [];
  const legalDocs = Array.isArray(draft?.legalDocs) ? draft.legalDocs : [];
  const featureFlags = draft?.featureFlags && typeof draft.featureFlags === "object"
    ? draft.featureFlags
    : {};

  return [
    {
      key: "home_updates",
      value: JSON.stringify(announcements),
      updated_at: iso,
    },
    {
      key: "legal_docs",
      value: JSON.stringify(legalDocs),
      updated_at: iso,
    },
    {
      key: "feature_flags",
      value: JSON.stringify(featureFlags),
      updated_at: iso,
    },
  ];
}

export function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

export function formatAge(value, now = Date.now()) {
  if (!value) return { hours: 0, label: "-" };
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const messageMs = new Date(value).getTime();
  if (!Number.isFinite(messageMs)) return { hours: 0, label: "-" };

  const diffMs = nowMs - messageMs;
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return { hours, label: "<1h" };
  if (hours < 24) return { hours, label: `${hours}h ago` };
  const days = Math.round(hours / 24);
  return { hours, label: `${days}d ago` };
}

export function summariseApplications(list = []) {
  return {
    total: list.length,
    approved: list.filter((item) => normaliseStatus(item?.status) === "completed").length,
    pending: list.filter((item) => !item?.status || normaliseStatus(item.status) === "open").length,
    declined: list.filter((item) => normaliseStatus(item?.status) === "cancelled").length,
  };
}

export function fallback(value) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length ? text : "-";
}

export function buildDealerSummary(application = {}) {
  return [
    { label: "Company name", value: fallback(application.company_name) },
    { label: "Company address", value: fallback(application.company_address) },
    { label: "VAT number", value: fallback(application.vat_number) },
    { label: "Companies House", value: fallback(application.company_number) },
    { label: "CEO name", value: fallback(application.ceo_name) },
    { label: "CEO mobile", value: fallback(application.ceo_phone) },
    { label: "Company email", value: fallback(application.company_email) },
    { label: "Company phone", value: fallback(application.company_phone ?? application.company_landline) },
  ];
}

export function buildDriverSummary(application = {}) {
  const fullName = (() => {
    const full = String(application.full_name ?? "").trim();
    if (full) return full;
    const parts = [application.first_name, application.last_name]
      .map((part) => (part ? String(part).trim() : ""))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  })();

  return [
    { label: "Full name", value: fallback(fullName ?? "Driver") },
    { label: "Email", value: fallback(application.email) },
    { label: "Mobile", value: fallback(application.phone) },
    { label: "Trade policy #", value: fallback(application.trade_policy_number) },
    { label: "Trade policy provider", value: fallback(application.trade_policy_provider) },
    { label: "Submitted from", value: fallback(application.city ?? application.region) },
  ];
}

export function buildDocuments(kind, application = {}) {
  const base = kind === "dealers"
    ? [
        { label: "Utility bill", url: application.utility_bill_url },
        { label: "CEO selfie", url: application.ceo_selfie_url },
        { label: "CEO licence", url: application.ceo_license_url },
        { label: "Trade insurance", url: application.insurance_docs_url },
      ]
    : [
        { label: "Driving licence", url: application.driving_license_url },
        { label: "Trade policy", url: application.trade_policy_url },
        { label: "Passport", url: application.passport_url },
        { label: "Selfie", url: application.selfie_url },
        { label: "Utility bill #1", url: application.utility_bill_one_url },
        { label: "Utility bill #2", url: application.utility_bill_two_url },
      ];

  return base.filter((doc) => doc.url);
}
