<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

const displayName = computed(() => {
  if (auth.user?.name) {
    return auth.user.name;
  }
  const email = auth.user?.email ?? '';
  if (email.includes('@')) {
    return email.split('@')[0];
  }
  return 'MotorRelay driver';
});

const primaryEmail = computed(() => auth.user?.email ?? 'user@motorrelay.com');
const roleLabel = computed(() => {
  if (auth.role === 'dealer') return 'MotorRelay dealer';
  if (auth.role === 'admin') return 'MotorRelay admin';
  return 'MotorRelay driver';
});
const rating = computed(() => 4.8);
const dataset = computed(() => {
  const assigned = Array.isArray(auth.assignedJobs) ? auth.assignedJobs : [];
  const posted = Array.isArray(auth.postedJobs) ? auth.postedJobs : [];

  let combined = assigned;

  if (auth.role === 'admin') {
    combined = [...assigned, ...posted];
  } else if (auth.role === 'dealer') {
    combined = posted;
  }

  return [...combined].sort((a, b) => {
    const timeA = new Date(a?.created_at ?? 0).getTime();
    const timeB = new Date(b?.created_at ?? 0).getTime();
    return timeB - timeA;
  });
});
const isLoading = computed(() => auth.loading && Boolean(auth.token));

const metrics = computed(() => calculateMetrics(dataset.value));
const formattedRevenue = computed(() => currencyFormatter.format(metrics.value.totalRevenue));
const formattedAverage = computed(() => currencyFormatter.format(metrics.value.avgPrice));
const completedList = computed(() => {
  const statuses = new Set(['completed', 'closed']);
  return dataset.value.filter((job) => statuses.has(String(job.status || '').toLowerCase()));
});
const hasJobs = computed(() => completedList.value.length > 0);
const recentJobs = computed(() => completedList.value.slice(0, 5));
const recentJobCount = computed(() => recentJobs.value.length);

function calculateMetrics(jobs) {
  const currentStatuses = new Set(['accepted', 'collected', 'in_transit', 'pending', 'in_progress']);
  const completedStatuses = new Set(['completed', 'delivered', 'closed']);
  const cancelledStatus = 'cancelled';

  const summary = {
    completed: 0,
    current: 0,
    cancelled: 0,
    totalRevenue: 0,
    avgPrice: 0,
    onTimePct: 0
  };

  const completedJobs = Array.isArray(jobs) ? jobs.filter((job) => completedStatuses.has(String(job.status || '').toLowerCase())) : [];
  const currentJobs = Array.isArray(jobs) ? jobs.filter((job) => currentStatuses.has(String(job.status || '').toLowerCase())) : [];
  const cancelledJobs = Array.isArray(jobs) ? jobs.filter((job) => String(job.status || '').toLowerCase() === cancelledStatus) : [];

  summary.completed = completedJobs.length;
  summary.current = currentJobs.length;
  summary.cancelled = cancelledJobs.length;
  summary.totalRevenue = completedJobs.reduce((running, job) => running + Number(job.price || 0), 0);
  summary.avgPrice = summary.completed ? summary.totalRevenue / summary.completed : 0;

  const denom = summary.completed + summary.cancelled;
  summary.onTimePct = denom ? Math.round((summary.completed / denom) * 100) : 0;

  return summary;
}

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPrice(value) {
  return currencyFormatter.format(Number(value || 0));
}
</script>

<template>
  <section class="tile grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-[200px,1fr]">
    <div class="space-y-4">
      <div class="grid h-40 w-40 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Photo
      </div>
      <p class="text-xs text-slate-500">
        Placeholder photo assigned at registration.
      </p>
    </div>

    <div class="grid gap-4">
      <header class="border-b border-slate-100 pb-4">
        <h2 class="text-xl font-semibold text-slate-900">{{ displayName }}</h2>
        <p class="text-sm text-slate-600">
          {{ primaryEmail }} &bull; {{ roleLabel }}
        </p>
        <p class="mt-2 text-sm font-semibold text-emerald-600">
          Rating: {{ rating.toFixed(1) }} / 5
        </p>
      </header>

      <div v-if="isLoading" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading scorecard&hellip;
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed jobs</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ metrics.completed }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Active jobs</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ metrics.current }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">On time</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ metrics.onTimePct }}%
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total revenue</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ formattedRevenue }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Average price</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ formattedAverage }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Cancelled</h3>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ metrics.cancelled }}
          </p>
        </article>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-4">
        <header class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">Recent jobs</h3>
          <span v-if="hasJobs" class="text-xs text-slate-500">Last {{ recentJobCount }} shown</span>
        </header>
        <p v-if="!hasJobs" class="text-sm text-slate-600">
          No job activity yet. Accepted or posted runs will appear here once work starts.
        </p>
        <ol v-else class="space-y-3">
          <li
            v-for="job in recentJobs"
            :key="job.id"
            class="rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ formatPrice(job.price) }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ formatDate(job.created_at) }}
                </p>
              </div>
              <span class="badge bg-slate-200 text-slate-800">
                {{ job.status }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-700">
              {{ job.company || 'Customer' }} &bull; {{ job.vehicle_make || 'Vehicle' }}
            </p>
            <p class="text-xs text-slate-500">
              {{ job.pickup_postcode || '??' }} &rarr; {{ job.dropoff_postcode || '??' }}
            </p>
          </li>
        </ol>
      </section>

      <p class="text-sm text-slate-500">
        Recent reviews: <i>Reliable, careful with EVs, good comms.</i>
      </p>
    </div>
  </section>
</template>


