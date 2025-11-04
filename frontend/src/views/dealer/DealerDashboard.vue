<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ProfileScorecard from '@/views/profile/ProfileScorecard.vue';

const auth = useAuthStore();

onMounted(() => {
  if (!auth.user && auth.token) {
    auth.fetchMe().catch(() => null);
  }
});

const postedJobs = computed(() => {
  const list = Array.isArray(auth.postedJobs) ? auth.postedJobs : auth.jobs?.posted;
  return Array.isArray(list) ? [...list] : [];
});

const openJobs = computed(() =>
  postedJobs.value.filter((job) => {
    const status = String(job?.status ?? '').toLowerCase();
    return status === 'open' || status === 'pending';
  })
);

const awaitingLive = computed(() =>
  postedJobs.value.filter((job) => {
    if (!job?.goes_live_at) return false;
    const date = new Date(job.goes_live_at);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  })
);

const scheduledJobs = computed(() =>
  postedJobs.value.filter((job) => {
    const status = String(job?.status ?? '').toLowerCase();
    return status === 'in_progress' || status === 'scheduled' || status === 'assigned';
  })
);

const completedJobs = computed(() => {
  const list = Array.isArray(auth.completedJobs) ? auth.completedJobs : auth.jobs?.completed;
  return Array.isArray(list) ? list : [];
});

const usage = computed(() => auth.usage || {});
const unreadMessages = computed(
  () =>
    Number(
      usage.value.unread_threads ??
        usage.value.unreadThreads ??
        usage.value.unread_messages ??
        usage.value.unreadMessages ??
        0
    ) || 0
);

const planLabel = computed(() => {
  if (!auth.plan) return auth.planSlug || 'MotorRelay plan';
  if (typeof auth.plan === 'string') return auth.plan;
  return auth.plan.name || auth.plan.title || auth.plan.slug || 'MotorRelay plan';
});

const upcomingJobs = computed(() => {
  const sorted = [...scheduledJobs.value].sort((a, b) => {
    const aDate = new Date(a?.pickup_at ?? a?.goes_live_at ?? a?.created_at ?? 0).getTime();
    const bDate = new Date(b?.pickup_at ?? b?.goes_live_at ?? b?.created_at ?? 0).getTime();
    return aDate - bDate;
  });
  return sorted.slice(0, 5);
});

const quickLinks = computed(() => [
  {
    to: '/jobs/new',
    label: 'Create job',
    description: 'Post a new run for marketplace drivers',
    icon: '➕'
  },
  {
    to: '/jobs',
    label: 'Manage jobs',
    description: 'Track open, scheduled, and completed work',
    icon: '📦'
  },
  {
    to: '/messages',
    label: 'Messages',
    description: unreadMessages.value
      ? `${unreadMessages.value} conversations need a reply`
      : 'Stay in sync with drivers',
    icon: '✉️'
  },
  {
    to: '/invoices',
    label: 'Invoices',
    description: 'Generate paperwork and POD for deliveries',
    icon: '📄'
  }
]);

function formatRun(job) {
  const pickup = job?.pickup_label || job?.pickup_postcode || job?.pickup_city || 'Pickup';
  const dropoff = job?.dropoff_label || job?.dropoff_postcode || job?.dropoff_city || 'Drop-off';
  return `${pickup} → ${dropoff}`;
}

function formatStatus(job) {
  return String(job?.status ?? 'Scheduled')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-6">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Dealer dashboard</h1>
              <p class="text-sm text-slate-600">
                Overview of your MotorRelay runs and team activity.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              {{ planLabel }}
            </span>
            <span class="rounded-xl border border-slate-200 px-3 py-1">
              Posted jobs: {{ postedJobs.length }}
            </span>
            <span class="rounded-xl border border-slate-200 px-3 py-1">
              Completed: {{ completedJobs.length }}
            </span>
          </div>
        </header>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Open marketplace jobs</h2>
            <p class="mt-2 text-2xl font-bold text-emerald-900">{{ openJobs.length }}</p>
            <p class="text-xs text-emerald-700">Keep an eye on runs that need drivers.</p>
          </div>
          <div class="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-sky-700">Awaiting go-live</h2>
            <p class="mt-2 text-2xl font-bold text-sky-900">{{ awaitingLive.length }}</p>
            <p class="text-xs text-sky-700">Schedule adjustments still possible before they publish.</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Quick workspace</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
          >
            <div>
              <div class="flex items-center gap-2 text-base font-semibold text-slate-900">
                <span aria-hidden="true">{{ link.icon }}</span>
                {{ link.label }}
              </div>
              <p class="mt-2 text-xs text-slate-600">
                {{ link.description }}
              </p>
            </div>
            <span class="text-xs font-semibold text-emerald-600 transition group-hover:underline">
              Open {{ link.label }}
            </span>
          </RouterLink>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Upcoming runs</h2>
          <RouterLink to="/jobs" class="text-xs font-semibold text-emerald-600 hover:underline">
            Manage jobs
          </RouterLink>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Scheduled jobs and assignments that are in progress or awaiting go-live.
        </p>

        <div v-if="!upcomingJobs.length" class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You have no scheduled runs right now. Create a job to reserve a driver.
        </div>

        <div v-else class="mt-4 space-y-3">
          <article
            v-for="job in upcomingJobs"
            :key="job.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-slate-900">
                  {{ job.title || `Job #${job.id}` }}
                </h3>
                <p class="text-xs text-slate-500">{{ formatRun(job) }}</p>
              </div>
              <span class="badge bg-slate-100 text-slate-700">
                {{ formatStatus(job) }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Driver: {{ job.assigned_to?.name || job.driver_name || 'Not assigned' }}</span>
              <span v-if="job.goes_live_at">Goes live {{ formatDate(job.goes_live_at) }}</span>
              <span v-else-if="job.pickup_at">Pickup {{ formatDate(job.pickup_at) }}</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <RouterLink
                :to="`/jobs/${job.id}`"
                class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View job
              </RouterLink>
              <RouterLink
                :to="`/jobs/${job.id}/edit`"
                class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit run
              </RouterLink>
            </div>
          </article>
        </div>
      </section>
    </div>

    <aside class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
        <ProfileScorecard />
      </div>

      <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-sm font-semibold text-slate-900">Dealer essentials</h2>
        <p class="text-sm text-slate-600">
          Post runs, message drivers, and finalise paperwork faster with these shortcuts.
        </p>
        <div class="space-y-3 text-sm text-slate-600">
          <RouterLink
            to="/jobs/new"
            class="block rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Create a new job
          </RouterLink>
          <RouterLink
            to="/profile/completed"
            class="block rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View completed jobs
          </RouterLink>
          <RouterLink
            to="/messages"
            class="block rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Check messages
          </RouterLink>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Tip: Need to adjust availability or reserve a lane? Save a hold in the planner first, then publish a job with the exact slot.
        </div>
      </div>
    </aside>
  </div>
</template>
