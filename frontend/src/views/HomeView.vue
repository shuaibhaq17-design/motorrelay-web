<script setup>
import { computed, onMounted, ref } from 'vue';
import ProfileScorecard from '@/views/profile/ProfileScorecard.vue';
import { useAuthStore } from '@/stores/auth';
import { fetchJobHighlights } from '@/services/jobs';
import { RouterLink } from 'vue-router';

const defaultUpdates = [
  '?? Improved job matching accuracy',
  '?? This week: 10% off delivery fees (Fri-Sun)',
  '??? Live tracking accuracy upgrades',
  '??? Tip: Use job # to search',
  '??? New fraud checks for payouts'
];

const demoJobs = [
  { id: 'demo-1', price: 72, pickup_label: 'Camden', dropoff_label: 'Croydon' },
  { id: 'demo-2', price: 60, pickup_label: 'Reading', dropoff_label: 'Guildford' },
  { id: 'demo-3', price: 120, pickup_label: 'Leeds', dropoff_label: 'Bradford' }
];

const auth = useAuthStore();
const jobs = ref([]);
const loading = ref(false);

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  loading.value = true;
  try {
    const payload = await fetchJobHighlights();
    jobs.value = Array.isArray(payload?.jobs) ? payload.jobs : [];
  } catch (error) {
    console.error('Failed to load highlight jobs', error);
    jobs.value = [];
  } finally {
    loading.value = false;
  }
});

const jobsToDisplay = computed(() => {
  const source = jobs.value?.length ? jobs.value : demoJobs;
  return source.slice(0, 3);
});

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short'
});

function countEntries(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatShortDate(value) {
  if (!value) return null;
  try {
    return shortDateFormatter.format(new Date(value));
  } catch {
    return null;
  }
}

const longDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return null;
  try {
    return longDateTimeFormatter.format(date);
  } catch {
    try {
      return date.toLocaleString('en-GB');
    } catch {
      return String(value);
    }
  }
}

function getUsageField(...keys) {
  const usage = auth.usage || {};
  const flatKeys = keys.flat().filter(Boolean);
  for (const key of flatKeys) {
    const value = usage[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function humanize(value) {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const dealerPostedJobsList = computed(() => {
  const jobs = auth.postedJobs ?? auth.jobs?.posted;
  return Array.isArray(jobs) ? jobs : [];
});

const dealerPostedJobsCount = computed(() => dealerPostedJobsList.value.length);

const dealerOpenJobsCount = computed(() =>
  dealerPostedJobsList.value.filter((job) => {
    const status = String(job?.status ?? '').toLowerCase();
    return status === 'open' || status === 'pending';
  }).length
);

const dealerAwaitingGoLiveCount = computed(() =>
  dealerPostedJobsList.value.filter((job) => {
    const date = toDate(job?.goes_live_at);
    return Boolean(date) && date.getTime() > Date.now();
  }).length
);

const dealerCompletedJobsCount = computed(() => {
  const completed = auth.completedJobs ?? auth.jobs?.completed;
  return countEntries(completed);
});

const dealerActiveAssignmentsCount = computed(() => countEntries(auth.assignedJobs));

const dealerPlanLabel = computed(() => resolvePlanLabel(auth.plan, auth.planSlug || 'MotorRelay plan'));

function findNextDriverJob(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) {
    return null;
  }

  const ranked = jobs
    .map((job) => {
      const pickupCandidate =
        job?.pickup_at ??
        job?.pickup_time ??
        job?.start_at ??
        job?.start_time ??
        job?.scheduled_at ??
        job?.assigned_at ??
        job?.created_at;
      const pickup = toDate(pickupCandidate);
      return { job, pickup };
    })
    .sort((a, b) => {
      const aTime = a.pickup ? a.pickup.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.pickup ? b.pickup.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

  return ranked[0] || null;
}

function resolvePlanLabel(plan, fallback = 'MotorRelay plan') {
  if (!plan) return fallback;
  if (typeof plan === 'string') return plan;
  return plan.name || plan.title || fallback;
}

function countByStatus(jobs, statuses) {
  if (!Array.isArray(jobs) || !Array.isArray(statuses) || !statuses.length) return 0;
  const statusSet = new Set(statuses.map((status) => String(status).toLowerCase()));
  return jobs.reduce((total, job) => {
    const status = String(job?.status ?? '').toLowerCase();
    return statusSet.has(status) ? total + 1 : total;
  }, 0);
}

const quickActions = computed(() => {
  if (!auth.isAuthenticated) return [];

  const usage = auth.usage || {};
  const planLimits = auth.planLimits || {};

  const assignedCount = countEntries(auth.assignedJobs);
  const activeDriverJobs = countByStatus(auth.assignedJobs, ['assigned', 'accepted', 'in_progress']);
  const completedCount = countEntries(auth.completedJobs);
  const postedCount = countEntries(auth.postedJobs);

  const jobPostsThisMonth = safeNumber(usage.job_posts_this_month ?? usage.jobPostsThisMonth ?? postedCount);
  const urgentBoostsUsed = safeNumber(usage.urgent_boosts_used ?? usage.urgentBoostsUsed);
  const applicationsToday = safeNumber(usage.applications_today ?? usage.applicationsToday);
  const plannerEntries = safeNumber(usage.planner_entries ?? usage.plannerEntries);
  const pendingInvoices = safeNumber(
    usage.pending_invoices ?? usage.pendingInvoices ?? usage.unpaid_invoices ?? usage.unpaidInvoices
  );
  const invoicesCompleted = safeNumber(usage.invoices_completed ?? usage.invoicesCompleted, null);
  const unreadThreads = safeNumber(
    usage.unread_threads ?? usage.unreadThreads ?? usage.unread_messages ?? usage.unreadMessages
  );
  const pendingApplications = safeNumber(usage.pending_applications ?? usage.pendingApplications);
  const pendingAccountRequests = safeNumber(
    usage.pending_account_requests ?? usage.pendingAccountRequests ?? usage.account_updates_pending
  );
  const systemAlerts = safeNumber(
    usage.system_alerts ?? usage.systemAlerts ?? usage.platform_alerts ?? usage.platformAlerts
  );

  const monthlyJobLimit = safeNumber(
    planLimits.monthly_job_posts ?? planLimits.monthlyJobPosts ?? planLimits.job_posts_per_month,
    0
  );
  const remainingPosts = monthlyJobLimit ? Math.max(monthlyJobLimit - jobPostsThisMonth, 0) : null;

  const planLabel = resolvePlanLabel(auth.plan);
  const profileLastUpdated = formatShortDate(auth.user?.updated_at);

  const items = [];

  if (auth.role === 'driver') {
    items.push(
      {
        to: '/driver',
        title: 'Driver dashboard',
        description: 'Snapshot of your runs and earnings',
        snippet: `Active runs: ${activeDriverJobs}`,
        metrics: [
          { label: 'Active runs', value: activeDriverJobs },
          { label: 'Completed', value: completedCount }
        ]
      },
      {
        to: '/jobs',
        title: 'My jobs',
        description: 'Review applications, assignments, and history',
        snippet: `Assignments today: ${activeDriverJobs} � Completed: ${completedCount}`,
        metrics: [
          { label: 'Assigned', value: assignedCount },
          { label: 'Completed', value: completedCount }
        ]
      },
      {
        to: '/planner',
        title: 'Planner',
        description: 'Hold dates, routes, and availability',
        snippet: plannerEntries ? `Saved holds: ${plannerEntries}` : 'Plan your week with route holds',
        metrics: plannerEntries ? [{ label: 'Saved holds', value: plannerEntries }] : []
      },
      {
        to: '/account',
        title: 'Account settings',
        description: 'Request updates to your details',
        snippet: profileLastUpdated ? `Last updated ${profileLastUpdated}` : 'Keep your driver profile current',
        metrics: profileLastUpdated ? [{ label: 'Updated', value: profileLastUpdated }] : []
      }
    );
  } else if (auth.role === 'dealer') {
    items.push(
      {
        to: '/dealer',
        title: 'Dealer dashboard',
        description: 'Monitor posted runs, plan usage, and application trends',
        snippet: `Posted jobs: ${postedCount} � Active drivers: ${assignedCount}`,
        metrics: [
          { label: 'Active postings', value: postedCount },
          { label: 'Plan', value: planLabel }
        ]
      },
      {
        to: '/profile',
        title: 'Account overview',
        description: 'Usage, plan limits, and recent activity',
        snippet: `Current plan: ${planLabel}`,
        metrics: [
          { label: 'Job posts this month', value: jobPostsThisMonth },
          { label: 'Applications today', value: applicationsToday }
        ]
      },
      {
        to: '/jobs/new',
        title: 'Create job',
        description: 'Post a run in under two minutes',
        snippet:
          remainingPosts !== null
            ? `${remainingPosts} posts remaining this month`
            : 'Unlimited job posts available',
        metrics: [
          { label: 'Active postings', value: postedCount },
          { label: 'Urgent boosts used', value: urgentBoostsUsed }
        ]
      },
      {
        to: '/messages',
        title: 'Messages',
        description: 'Coordinate with drivers instantly',
        snippet: unreadThreads ? `${unreadThreads} unread conversations` : 'All conversations cleared',
        metrics: [{ label: 'Unread', value: unreadThreads }]
      },
      {
        to: '/account',
        title: 'Account settings',
        description: 'Request updates to your company info',
        snippet: profileLastUpdated ? `Last updated ${profileLastUpdated}` : 'Keep company details up to date',
        metrics: profileLastUpdated ? [{ label: 'Updated', value: profileLastUpdated }] : []
      }
    );
  } else if (auth.role === 'admin') {
    items.push(
      {
        to: '/admin',
        title: 'Admin portal',
        description: 'Manage applications, content, and teams',
        snippet: pendingApplications ? `${pendingApplications} applications waiting` : 'All applications reviewed',
        metrics: [{ label: 'Open applications', value: pendingApplications }]
      },
      {
        to: '/admin/account-requests',
        title: 'Account updates',
        description: 'Review change requests from users',
        snippet: pendingAccountRequests
          ? `${pendingAccountRequests} requests awaiting review`
          : 'No pending account updates',
        metrics: [{ label: 'Pending requests', value: pendingAccountRequests }]
      },
      {
        to: '/admin/system-health',
        title: 'System health',
        description: 'Monitor platform status and uptime',
        snippet: systemAlerts ? `${systemAlerts} active alerts` : 'System operating normally',
        metrics: [{ label: 'Active alerts', value: systemAlerts }]
      },
      {
        to: '/messages',
        title: 'Messages',
        description: 'Keep conversations moving with your team',
        snippet: unreadThreads ? `${unreadThreads} unread conversations` : 'Inbox clear',
        metrics: [{ label: 'Unread', value: unreadThreads }]
      }
    );
  }

  if (['driver', 'dealer', 'admin'].includes(auth.role)) {
    const invoiceMetrics = [
      { label: 'Pending', value: pendingInvoices }
    ];
    if (invoicesCompleted !== null) {
      invoiceMetrics.push({ label: 'Completed', value: invoicesCompleted });
    }

    items.push({
      to: '/invoices',
      title: 'Invoices',
      description: 'Generate or download POD-ready invoices',
      snippet: pendingInvoices ? `${pendingInvoices} awaiting action` : 'All invoices are up to date',
      metrics: invoiceMetrics
    });
  }

  return items.map((item) => ({
    ...item,
    metrics: Array.isArray(item.metrics)
      ? item.metrics.filter(
          (metric) =>
            metric &&
            metric.label &&
            metric.value !== null &&
            metric.value !== undefined &&
            metric.value !== ''
        )
      : []
  }));
});

const featuredPanels = computed(() => {
  if (!auth.isAuthenticated) return [];

  const usage = auth.usage || {};
  const assignedJobs = Array.isArray(auth.assignedJobs) ? auth.assignedJobs : [];
  const completedJobs = Array.isArray(auth.completedJobs) ? auth.completedJobs : [];

  const activeDriverJobs = countByStatus(assignedJobs, ['assigned', 'accepted', 'in_progress']);
  const driverAction = quickActions.value.find((action) => action.to === '/driver');

  const panels = [];

  if (auth.role === 'driver' && driverAction) {
    const next = findNextDriverJob(assignedJobs);
    const nextJob = next?.job ?? null;
    const nextPickup = next?.pickup ?? null;
    const pickupLocation =
      nextJob?.pickup_label || nextJob?.pickup_postcode || nextJob?.pickup_town || nextJob?.pickup_city || null;
    const dropoffLocation =
      nextJob?.dropoff_label ||
      nextJob?.dropoff_postcode ||
      nextJob?.dropoff_town ||
      nextJob?.dropoff_city ||
      null;
    const jobPrice =
      nextJob && nextJob.price !== undefined && nextJob.price !== null
        ? priceFormatter.format(Number(nextJob.price) || 0)
        : null;
    const jobStatus = nextJob?.status ? humanize(nextJob.status) : null;
    const jobReference = nextJob?.reference || nextJob?.job_reference || nextJob?.id || null;

    const driverStats =
      Array.isArray(driverAction.metrics) && driverAction.metrics.length
        ? driverAction.metrics
        : [
            { label: 'Active runs', value: activeDriverJobs },
            { label: 'Completed', value: completedJobs.length }
          ];

    const driverDetails = [
      nextPickup
        ? {
            label: 'Next pickup',
            value: formatDateTime(nextPickup),
            secondary: pickupLocation || undefined
          }
        : pickupLocation
        ? { label: 'Next pickup', value: pickupLocation }
        : null,
      dropoffLocation ? { label: 'Drop-off', value: dropoffLocation } : null,
      jobPrice ? { label: 'Job value', value: jobPrice } : null,
      jobStatus ? { label: 'Status', value: jobStatus } : null,
      jobReference ? { label: 'Reference', value: jobReference } : null
    ].filter(Boolean);

    panels.push({
      key: 'driver-dashboard',
      to: driverAction.to,
      title: driverAction.title,
      description: driverAction.description || 'Live runs, earnings, mileage, and POD uploads.',
      highlight:
        driverAction.snippet ||
        (activeDriverJobs ? `Active runs: ${activeDriverJobs}` : 'Review current assignments and earnings'),
      stats: driverStats,
      details: driverDetails,
      accent: 'emerald'
    });
  }

  const plannerAccessible = auth.role === 'driver' || auth.hasPlannerAccess;
  if (plannerAccessible) {
    const plannerAction = quickActions.value.find((action) => action.to === '/planner');
    const plannerEntriesCount = safeNumber(usage.planner_entries ?? usage.plannerEntries, 0);
    const plannerWeekLoad = safeNumber(
      getUsageField('planner_routes_this_week', 'plannerRoutesThisWeek', 'routes_this_week', 'routesThisWeek'),
      null
    );
    const plannerNextRaw = getUsageField(
      'planner_next_date',
      'plannerNextDate',
      'planner_next',
      'next_hold_date',
      'upcoming_hold_date',
      'next_availability'
    );
    const plannerNextDate = formatDateTime(plannerNextRaw) || formatShortDate(plannerNextRaw);
    const plannerNextLocation = getUsageField(
      'planner_next_location',
      'plannerNextLocation',
      'planner_next_route',
      'planner_next_label',
      'plannerNextRoute'
    );

    const plannerStats =
      Array.isArray(plannerAction?.metrics) && plannerAction.metrics.length
        ? plannerAction.metrics
        : [
            { label: 'Saved holds', value: plannerEntriesCount },
            { label: 'Routes this week', value: plannerWeekLoad ?? '-' }
          ];

    const plannerDetails = [
      plannerNextDate || plannerNextLocation
        ? {
            label: 'Next hold',
            value: plannerNextDate || plannerNextLocation,
            secondary: plannerNextDate && plannerNextLocation ? plannerNextLocation : undefined
          }
        : null,
      { label: 'Saved holds', value: plannerEntriesCount },
      plannerWeekLoad !== null ? { label: 'Routes this week', value: plannerWeekLoad } : null
    ]
      .filter(Boolean)
      .filter((detail, index, arr) => {
        const key = `${detail.label}-${detail.value}-${detail.secondary ?? ''}`;
        return (
          arr.findIndex((item) => `${item.label}-${item.value}-${item.secondary ?? ''}` === key) === index &&
          detail.value !== undefined
        );
      });

    panels.push({
      key: 'planner',
      to: plannerAction ? plannerAction.to : '/planner',
      title: plannerAction?.title || 'Planner',
      description:
        plannerAction?.description || 'Keep availability, holds, and recurring routes organised for your team.',
      highlight:
        plannerAction?.snippet ||
        (plannerEntriesCount
          ? `${plannerEntriesCount} saved holds ready to action`
          : 'Create route holds to reserve capacity'),
      stats: plannerStats,
      details: plannerDetails,
      accent: 'sky'
    });
  }

  return panels;
});

const showQuickActions = computed(() => {
  if (!auth.isAuthenticated) {
    return false;
  }
  if (auth.role === 'admin') {
    return quickActions.value.length > 0;
  }
  return false;
});
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-6 rounded-2xl border bg-white p-6 shadow md:grid-cols-3">
      <div class="md:col-span-2 space-y-6">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900">Welcome to MotorRelay</h1>
          <p class="mt-2 text-slate-600">
            Connect dealerships with trusted delivery drivers. Post jobs, accept runs, and get paid fast.
          </p>

          <div class="mt-4 flex flex-wrap gap-3">
            <RouterLink
              to="/jobs"
              class="tile inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-emerald-700 shadow-sm hover:bg-slate-50"
            >
              Find Jobs
            </RouterLink>

            <RouterLink
              v-if="auth.isDealer || auth.role === 'admin'"
              to="/jobs/new"
              class="tile inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-emerald-700 shadow-sm hover:bg-slate-50"
            >
              Create Job
            </RouterLink>

            <RouterLink
              to="/membership"
              class="tile inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-emerald-700 shadow-sm hover:bg-slate-50"
            >
              Membership
            </RouterLink>
          </div>

          <div v-if="featuredPanels.length" class="mt-6">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Featured workspaces</h2>
            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <RouterLink
                v-for="panel in featuredPanels"
                :key="panel.key"
                :to="panel.to"
                class="group flex flex-col justify-between gap-4 rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg lg:min-h-[220px]"
                :class="[
                  panel.accent === 'emerald'
                    ? 'border-emerald-200 bg-emerald-50'
                    : panel.accent === 'sky'
                    ? 'border-sky-200 bg-sky-50'
                    : 'border-slate-200 bg-slate-50'
                ]"
              >
                <div class="space-y-3">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 class="text-xl font-semibold text-slate-900">
                        {{ panel.title }}
                      </h3>
                      <p class="mt-1 text-sm text-slate-700">
                        {{ panel.description }}
                      </p>
                    </div>
                    <span
                      v-if="panel.highlight"
                      :class="[
                        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-white/70 transition',
                        panel.accent === 'sky'
                          ? 'border-sky-200 text-sky-700'
                          : panel.accent === 'emerald'
                          ? 'border-emerald-200 text-emerald-700'
                          : 'border-slate-200 text-slate-700'
                      ]"
                    >
                      {{ panel.highlight }}
                    </span>
                  </div>

                  <div
                    v-if="panel.details?.length"
                    class="grid gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 text-sm text-slate-700"
                  >
                    <div
                      v-for="detail in panel.details"
                      :key="`${panel.key}-${detail.label}-${detail.value}`"
                      class="flex flex-col gap-1 rounded-2xl bg-white/70 px-3 py-2"
                    >
                      <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {{ detail.label }}
                      </span>
                      <span class="text-sm font-semibold text-slate-900">
                        {{ detail.value }}
                      </span>
                      <span v-if="detail.secondary" class="text-xs text-slate-500">
                        {{ detail.secondary }}
                      </span>
                    </div>
                  </div>
                </div>

                <dl
                  v-if="panel.stats?.length"
                  class="grid grid-cols-2 gap-3 text-xs text-slate-500"
                >
                  <div
                    v-for="stat in panel.stats"
                    :key="`${panel.key}-stat-${stat.label}`"
                    class="rounded-2xl border border-white/60 bg-white/70 px-3 py-2"
                  >
                    <dt class="font-semibold text-slate-600">
                      {{ stat.label }}
                    </dt>
                    <dd class="mt-1 text-base font-semibold text-slate-900">
                      {{ stat.value }}
                    </dd>
                  </div>
                </dl>

                <div
                  class="mt-2 text-xs font-semibold transition group-hover:underline"
                  :class="
                    panel.accent === 'sky'
                      ? 'text-sky-700'
                      : panel.accent === 'emerald'
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  "
                >
                  Open {{ panel.title }}
                </div>
              </RouterLink>
            </div>
          </div>

          <div v-if="auth.role === 'dealer'" class="mt-6">
            <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div class="space-y-2">
                  <h2 class="text-xl font-semibold text-slate-900">Dealer dashboard</h2>
                  <p class="text-sm text-slate-600">
                    Overview of your MotorRelay runs, plan usage, and team activity.
                  </p>
                  <RouterLink
                    to="/dealer"
                    class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 md:hidden"
                  >
                    Open full dashboard
                    <span aria-hidden="true">?</span>
                  </RouterLink>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                    {{ dealerPlanLabel }}
                  </span>
                  <span class="rounded-xl border border-slate-200 px-3 py-1">
                    Posted jobs: {{ dealerPostedJobsCount }}
                  </span>
                  <span class="rounded-xl border border-slate-200 px-3 py-1">
                    Completed: {{ dealerCompletedJobsCount }}
                  </span>
                  <RouterLink
                    to="/dealer"
                    class="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 transition hover:bg-emerald-100 md:inline-flex"
                  >
                    Open full dashboard
                    <span aria-hidden="true">?</span>
                  </RouterLink>
                </div>
              </header>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Open marketplace jobs</h3>
                  <p class="mt-2 text-2xl font-bold text-emerald-900">{{ dealerOpenJobsCount }}</p>
                  <p class="text-xs text-emerald-700">
                    Keep an eye on runs that still need drivers.
                  </p>
                </div>
                <div class="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-sky-700">Awaiting go-live</h3>
                  <p class="mt-2 text-2xl font-bold text-sky-900">{{ dealerAwaitingGoLiveCount }}</p>
                  <p class="text-xs text-sky-700">
                    Schedule adjustments still possible before they publish.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div v-if="showQuickActions" class="mt-6">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick workspace</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <RouterLink
                v-for="action in quickActions"
                :key="action.to"
                :to="action.to"
                class="group flex min-h-[160px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <div class="text-base font-semibold text-slate-900">
                    {{ action.title }}
                  </div>
                  <p class="mt-1 text-xs text-slate-600">
                    {{ action.description }}
                  </p>
                  <p
                    v-if="action.snippet"
                    class="mt-3 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                  >
                    {{ action.snippet }}
                  </p>
                </div>
                <dl
                  v-if="action.metrics?.length"
                  class="mt-auto grid grid-cols-2 gap-2 text-[10px] text-slate-500"
                >
                  <div
                    v-for="metric in action.metrics"
                    :key="`${action.to}-${metric.label}`"
                    class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5"
                  >
                    <dt class="font-semibold text-slate-600">
                      {{ metric.label }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-slate-900">
                      {{ metric.value }}
                    </dd>
                  </div>
                </dl>
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div class="tile rounded-2xl bg-emerald-50 p-4">
            <div class="font-semibold text-emerald-900">Post or accept runs</div>
            <div class="text-sm text-emerald-700">Dealers post, drivers deliver.</div>
          </div>
          <div class="tile rounded-2xl bg-emerald-50 p-4">
            <div class="font-semibold text-emerald-900">Built-in messaging</div>
            <div class="text-sm text-emerald-700">Keep chats tidy.</div>
          </div>
          <div class="tile rounded-2xl bg-emerald-50 p-4">
            <div class="font-semibold text-emerald-900">Instant invoices</div>
            <div class="text-sm text-emerald-700">One click to print.</div>
          </div>
        </div>
      </div>

      <aside class="flex flex-col gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-0">
          <ProfileScorecard v-if="auth.role === 'dealer'" />
        </div>

        <div class="tile rounded-2xl border bg-white p-4">
          <div class="mb-1 font-semibold text-slate-900">Updates</div>
          <ul class="space-y-1 text-sm text-slate-600">
            <li v-for="(item, idx) in defaultUpdates" :key="idx">
              {{ item }}
            </li>
          </ul>
        </div>
      </aside>
    </section>

  </div>
</template>

