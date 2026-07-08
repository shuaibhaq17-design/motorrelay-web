<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchDriverOverview } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const overview = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

function formatPrice(value) {
  return priceFormatter.format(Number(value || 0));
}

function driverPayoutForJob(job) {
  const storedPayout = Number(job?.driver_payout_amount || 0);
  if (storedPayout > 0) return storedPayout;

  const price = Number(job?.price || 0);
  const storedFee = Number(job?.platform_fee_amount || 0);
  const platformFee = storedFee > 0 ? storedFee : Math.round(price * 0.1 * 100) / 100;

  return Math.max(price - platformFee, 0);
}

function formatDriverPayout(job) {
  return formatPrice(driverPayoutForJob(job));
}

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function loadOverview() {
  loading.value = true;
  errorMessage.value = '';
  try {
    overview.value = await fetchDriverOverview();
  } catch (error) {
    console.error('Failed to load driver overview', error);
    errorMessage.value = 'We could not load your dashboard. Please try again.';
    overview.value = null;
  } finally {
    loading.value = false;
  }
}

const stats = computed(() => overview.value?.stats ?? {});
const activeJobs = computed(() => overview.value?.active ?? []);
const currentJob = computed(() => activeJobs.value[0] ?? null);
const completedJobs = computed(() => overview.value?.completed ?? []);
const pendingApplications = computed(() => overview.value?.applications ?? []);

function jobStatusLabel(status) {
  return (status || 'in progress').toString().replace(/_/g, ' ');
}

function currentJobAction(job) {
  const status = String(job?.status || '').toLowerCase();
  const completionStatus = String(job?.completion_status || '').toLowerCase();

  if (status === 'in_progress' || status === 'accepted' || status === 'pending') {
    return 'Open this job and mark the vehicle collected.';
  }

  if (status === 'collected' || status === 'in_transit') {
    return 'Open this job and mark the vehicle delivered.';
  }

  if (status === 'delivered' && completionStatus !== 'submitted') {
    return 'Open this job and upload delivery proof.';
  }

  if (completionStatus === 'submitted' || status === 'completion_pending') {
    return 'Waiting for the dealer to approve your proof.';
  }

  return 'Open this job to see the next step.';
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadOverview();
});
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900">Driver dashboard</h1>
        <p class="text-sm text-slate-600">
          Track your active runs, check pending applications, and review completed deliveries.
        </p>
      </div>
      <RouterLink
        v-if="auth.hasPlannerAccess"
        to="/planner"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Open planner
        <span aria-hidden="true">→</span>
      </RouterLink>
    </header>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
            Loading your driver workspace...
    </div>

    <p v-else-if="errorMessage" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      {{ errorMessage }}
    </p>

    <template v-else>
      <section
        v-if="currentJob"
        class="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-3">
            <p class="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Current job</p>
            <div>
              <h2 class="text-2xl font-black text-slate-950">
                {{ currentJob.title || `Job #${currentJob.id}` }}
              </h2>
              <p class="mt-1 text-sm text-slate-600">
                {{ currentJob.pickup_postcode || '--' }} to {{ currentJob.dropoff_postcode || '--' }}
              </p>
            </div>
            <p class="max-w-2xl rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              {{ currentJobAction(currentJob) }}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Route</p>
              <p class="mt-1 font-black text-slate-950">
                {{ currentJob.pickup_postcode || '--' }} → {{ currentJob.dropoff_postcode || '--' }}
              </p>
            </div>
            <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Driver payout</p>
              <p class="mt-1 font-black text-emerald-700">{{ formatDriverPayout(currentJob) }}</p>
            </div>
            <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
              <p class="mt-1 font-black capitalize text-slate-950">{{ jobStatusLabel(currentJob.status) }}</p>
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            :to="`/jobs/${currentJob.id}`"
            class="btn-primary inline-flex justify-center px-5 py-3 text-sm"
          >
            Open current job
          </RouterLink>
          <RouterLink
            to="/jobs"
            class="btn-secondary inline-flex justify-center px-5 py-3 text-sm"
          >
            View all jobs
          </RouterLink>
        </div>
      </section>

      <section class="grid grid-cols-3 gap-3 lg:grid-cols-4">
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Active jobs</h2>
          <p class="mt-2 text-2xl font-bold text-slate-900">
            {{ stats.active_count ?? 0 }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed jobs</h2>
          <p class="mt-2 text-2xl font-bold text-slate-900">
            {{ stats.completed_count ?? 0 }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending applications</h2>
          <p class="mt-2 text-2xl font-bold text-slate-900">
            {{ stats.pending_applications ?? 0 }}
          </p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm col-span-3 lg:col-span-1">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total earnings</h2>
          <p class="mt-2 text-2xl font-bold text-slate-900">
            {{ formatPrice(stats.total_earnings ?? 0) }}
          </p>
        </article>
        <article
          v-if="auth.hasPlannerAccess"
          class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm col-span-3 lg:col-span-1"
        >
          <h2 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Planner status</h2>
          <p class="mt-2 text-base font-semibold text-emerald-900">
            Keep your availability synced with upcoming runs.
          </p>
          <RouterLink
            to="/planner"
            class="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/60"
          >
            Manage schedule
            <span aria-hidden="true">→</span>
          </RouterLink>
        </article>
      </section>

      <section
        v-if="auth.hasPlannerAccess"
        class="rounded-2xl border border-slate-200 bg-white p-6 space-y-3"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Planner quick access</h2>
            <p class="text-xs text-slate-500">
              Block out your calendar, pin pick-ups, and hold delivery slots before accepting new work.
            </p>
          </div>
          <RouterLink
            to="/planner"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open planner
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>
        <p class="text-xs text-slate-500">
          Saved routes and holds appear in the planner view. Update it daily to keep dealers in sync with your availability.
        </p>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Active jobs</h2>
            <p class="text-xs text-slate-500">
              Jobs currently assigned to you. Update status from the job detail screen.
            </p>
          </div>
          <RouterLink to="/jobs" class="btn-secondary inline-flex w-full justify-center px-4 py-2 text-sm sm:w-auto">
            View jobs
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>

        <div v-if="!activeJobs.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You have no active jobs right now.
        </div>

        <div v-else class="space-y-3">
          <RouterLink
            v-for="job in activeJobs"
            :key="job.id"
            :to="`/jobs/${job.id}`"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ job.title || `Job #${job.id}` }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ job.pickup_postcode || '--' }} → {{ job.dropoff_postcode || '--' }}
                </p>
                <p class="text-xs text-slate-500">
                  Posted by {{ job.posted_by?.name || 'Dealer' }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-emerald-600">
                  {{ formatDriverPayout(job) }}
                </div>
                <span class="badge bg-emerald-100 text-emerald-700">{{ job.status }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Pending applications</h2>
            <p class="text-xs text-slate-500">
              Dealers will review and confirm your application. You will be notified once accepted.
            </p>
          </div>
          <RouterLink to="/jobs" class="btn-secondary inline-flex w-full justify-center px-4 py-2 text-sm sm:w-auto">
            Browse jobs
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>

        <div v-if="!pendingApplications.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You have no pending applications.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="application in pendingApplications"
            :key="application.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ application.job?.title || `Job #${application.job?.id}` }}
                </p>
                <p class="text-xs text-slate-500">
                  Dealer: {{ application.job?.posted_by?.name || 'Dealer' }}
                </p>
                <p class="text-xs text-slate-500">
                  Applied {{ formatDate(application.created_at) }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-emerald-600">
                  {{ formatDriverPayout(application.job) }}
                </div>
                <span class="badge bg-amber-100 text-amber-700">{{ application.status }}</span>
              </div>
            </div>
            <p v-if="application.message" class="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              "{{ application.message }}"
            </p>
          </article>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Recently completed</h2>
            <p class="text-xs text-slate-500">
              A quick snapshot of the latest closed jobs. Explore everything from your scorecard.
            </p>
          </div>
          <RouterLink to="/profile" class="btn-secondary inline-flex w-full justify-center px-4 py-2 text-sm sm:w-auto">
            View scorecard
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>

        <div v-if="!completedJobs.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No completed jobs yet.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="job in completedJobs.slice(0, 5)"
            :key="job.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ job.title || `Job #${job.id}` }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ job.pickup_postcode || '--' }} → {{ job.dropoff_postcode || '--' }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-emerald-600">
                  {{ formatDriverPayout(job) }}
                </div>
                <span class="badge bg-slate-200 text-slate-800">{{ job.status }}</span>
              </div>
            </div>
            <p class="text-xs text-slate-500">
              Completed {{ formatDate(job.updated_at ?? job.created_at) }}
            </p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

