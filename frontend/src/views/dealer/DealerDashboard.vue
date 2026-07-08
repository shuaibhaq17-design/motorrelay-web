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
    marker: '+'
  },
  {
    to: '/jobs',
    label: 'Manage jobs',
    description: 'Track open, scheduled, and completed work',
    marker: 'MR'
  },
  {
    to: '/messages',
    label: 'Messages',
    description: unreadMessages.value
      ? `${unreadMessages.value} conversations need a reply`
      : 'Stay in sync with drivers',
    marker: 'IN'
  },
  {
    to: '/invoices',
    label: 'Invoices',
    description: 'Download invoices and delivery proof',
    marker: 'PDF'
  }
]);

function formatRun(job) {
  const pickup = job?.pickup_label || job?.pickup_postcode || job?.pickup_city || 'Pickup';
  const dropoff = job?.dropoff_label || job?.dropoff_postcode || job?.dropoff_city || 'Drop-off';
  return `${pickup} to ${dropoff}`;
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
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div class="space-y-6">
      <section class="section-card">
        <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Dealer workspace</p>
            <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950">Dealer dashboard</h1>
            <p class="mt-1 text-sm text-slate-600">
              Overview of your MotorRelay runs, driver activity, and paperwork.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-700">
              {{ planLabel }}
            </span>
            <span class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold">
              {{ postedJobs.length }} posted
            </span>
            <span class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold">
              {{ completedJobs.length }} completed
            </span>
          </div>
        </header>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-emerald-700">Open marketplace jobs</h2>
            <p class="mt-3 text-4xl font-black text-emerald-950">{{ openJobs.length }}</p>
            <p class="mt-1 text-sm text-emerald-800">Runs still waiting for driver applications.</p>
          </div>
          <div class="rounded-3xl border border-sky-100 bg-sky-50 p-5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-sky-700">Scheduled publishing</h2>
            <p class="mt-3 text-4xl font-black text-sky-950">{{ awaitingLive.length }}</p>
            <p class="mt-1 text-sm text-sky-800">Jobs still inside their edit window.</p>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h2 class="text-lg font-black text-slate-950">Quick workspace</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="group flex min-h-[150px] flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-xl"
          >
            <div>
              <div class="flex items-center gap-3 text-base font-black text-slate-950">
                <span class="flex h-9 min-w-9 items-center justify-center rounded-2xl bg-slate-950 px-2 text-xs font-black text-white">
                  {{ link.marker }}
                </span>
                {{ link.label }}
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-600">
                {{ link.description }}
              </p>
            </div>
            <span class="text-sm font-bold text-emerald-700 transition group-hover:text-emerald-800">
              Open {{ link.label }}
            </span>
          </RouterLink>
        </div>
      </section>

      <section class="section-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-black text-slate-950">Upcoming runs</h2>
            <p class="mt-1 text-sm text-slate-500">
              Scheduled jobs and assignments that are in progress or waiting to become visible to drivers.
            </p>
          </div>
          <RouterLink to="/jobs" class="text-sm font-bold text-emerald-700 hover:text-emerald-800">
            Manage jobs
          </RouterLink>
        </div>

        <div v-if="!upcomingJobs.length" class="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          You have no scheduled runs right now. Create a job to reserve a driver.
        </div>

        <div v-else class="mt-5 space-y-3">
          <article
            v-for="job in upcomingJobs"
            :key="job.id"
            class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-black text-slate-950">
                  {{ job.title || `Job #${job.id}` }}
                </h3>
                <p class="text-sm text-slate-500">{{ formatRun(job) }}</p>
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
            <div class="mt-4 flex flex-wrap gap-2">
              <RouterLink :to="`/jobs/${job.id}`" class="btn-secondary px-3 py-2 text-xs">
                View job
              </RouterLink>
              <RouterLink :to="`/jobs/${job.id}/edit`" class="btn-secondary px-3 py-2 text-xs">
                Edit run
              </RouterLink>
            </div>
          </article>
        </div>
      </section>
    </div>

    <aside class="space-y-4">
      <div class="tile overflow-hidden p-0">
        <ProfileScorecard />
      </div>

      <div class="section-card space-y-4">
        <h2 class="text-sm font-black text-slate-950">Dealer essentials</h2>
        <p class="text-sm leading-6 text-slate-600">
          Post runs, message drivers, and finalise paperwork faster with these shortcuts.
        </p>
        <div class="space-y-3 text-sm text-slate-600">
          <RouterLink to="/jobs/new" class="btn-primary w-full">
            Create a new job
          </RouterLink>
          <RouterLink to="/profile/completed" class="btn-secondary w-full">
            View completed jobs
          </RouterLink>
          <RouterLink to="/messages" class="btn-secondary w-full">
            Check messages
          </RouterLink>
        </div>
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
          Tip: reserve a lane in the planner first, then publish a job with the exact slot.
        </div>
      </div>
    </aside>
  </div>
</template>
