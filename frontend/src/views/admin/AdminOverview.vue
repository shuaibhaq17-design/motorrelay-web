<script setup>
import { computed, inject } from 'vue';

const dashboard = inject('adminDashboard');
const loading = inject('adminDashboardLoading');

const overview = computed(() => dashboard?.value?.overview || {});

const statCards = computed(() => {
  const stats = overview.value.stats || {};
  return [
    {
      key: 'active_jobs',
      label: 'Active jobs',
      value: stats.active_jobs?.value ?? 0,
      subtitle: stats.active_jobs?.subtitle || ''
    },
    {
      key: 'completed_jobs',
      label: 'Jobs completed',
      value: stats.completed_jobs?.value ?? 0,
      subtitle: stats.completed_jobs?.subtitle || ''
    },
    {
      key: 'memberships',
      label: 'Memberships',
      value: stats.memberships?.value ?? 0,
      subtitle: stats.memberships?.subtitle || ''
    }
  ];
});

const pipelineBuckets = computed(() => overview.value.pipeline || []);
const leaderboard = computed(() => overview.value.leaderboard || []);
const verification = computed(() => overview.value.verification || {});

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

const isRefreshing = computed(() => (loading && typeof loading.value !== 'undefined' ? loading.value : false));

const verificationTotals = computed(() => {
  const base = verification.value || {};
  const dealersPending = base.dealers_pending ?? 0;
  const dealersApproved = base.dealers_approved ?? 0;
  const driversPending = base.drivers_pending ?? 0;
  const driversApproved = base.drivers_approved ?? 0;

  return {
    dealers: dealersPending + dealersApproved,
    drivers: driversPending + driversApproved
  };
});
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="tile rounded-2xl bg-white p-4"
      >
        <div class="text-sm font-semibold text-slate-600">{{ card.label }}</div>
        <div class="mt-2 text-3xl font-bold text-slate-900">{{ card.value }}</div>
        <div class="mt-1 text-xs text-emerald-600">{{ card.subtitle }}</div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="tile rounded-2xl bg-white p-4">
        <header class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Job pipeline</h2>
            <p class="text-xs text-slate-500">Quick glance at workflow status.</p>
          </div>
          <span
            v-if="isRefreshing"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
          >
            Updating...
          </span>
        </header>

        <div class="space-y-4">
          <div
            v-for="bucket in pipelineBuckets"
            :key="bucket.status"
            class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start sm:justify-between"
          >
            <header class="flex items-center gap-3">
              <div class="text-base font-semibold text-slate-900">{{ bucket.label }}</div>
              <span class="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {{ bucket.count }} {{ bucket.count === 1 ? 'job' : 'jobs' }}
              </span>
            </header>

            <div class="sm:w-2/3 lg:w-3/4">
              <p v-if="!bucket.jobs?.length" class="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                No jobs currently in this step.
              </p>

              <ol v-else class="space-y-3 text-sm text-slate-600">
                <li
                  v-for="job in bucket.jobs"
                  :key="job.id"
                  class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-semibold text-slate-800">{{ job.reference }}</span>
                    <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {{ job.pickup_postcode || 'N/A' }}
                      <span aria-hidden="true">→</span>
                      {{ job.dropoff_postcode || 'N/A' }}
                    </span>
                  </div>
                  <p v-if="job.title" class="mt-1 text-xs text-slate-500">
                    {{ job.title }}
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section class="tile rounded-2xl bg-white p-4">
        <header class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Driver leaderboard</h2>
            <p class="text-xs text-slate-500">Based on assigned jobs.</p>
          </div>
          <span
            v-if="leaderboard.length"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
          >
            {{ leaderboard.length }} drivers
          </span>
        </header>

        <div v-if="!leaderboard.length" class="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          No driver assignments yet.
        </div>

        <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3 font-semibold">Driver</th>
                <th class="px-4 py-3 font-semibold">Completed</th>
                <th class="px-4 py-3 font-semibold">Active</th>
                <th class="px-4 py-3 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="row in leaderboard"
                :key="row.driver"
                class="bg-white"
              >
                <td class="px-4 py-3 font-medium text-slate-900">{{ row.driver }}</td>
                <td class="px-4 py-3 text-slate-700">{{ row.completed }}</td>
                <td class="px-4 py-3 text-slate-700">{{ row.active }}</td>
                <td class="px-4 py-3 font-semibold text-emerald-700">
                  {{ currency.format(row.revenue || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="tile rounded-2xl bg-white p-4">
      <header class="mb-3">
        <h2 class="text-lg font-semibold text-slate-900">Verification backlog</h2>
        <p class="text-xs text-slate-500">Applications awaiting a decision.</p>
      </header>

      <div class="grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase text-slate-500">Dealers pending</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ verification.dealers_pending ?? 0 }}</div>
          <div class="text-[11px] text-slate-400">{{ verificationTotals.dealers }} total</div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase text-slate-500">Dealers approved</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ verification.dealers_approved ?? 0 }}</div>
          <div class="text-[11px] text-slate-400">{{ verificationTotals.dealers }} total</div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase text-slate-500">Drivers pending</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ verification.drivers_pending ?? 0 }}</div>
          <div class="text-[11px] text-slate-400">{{ verificationTotals.drivers }} total</div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase text-slate-500">Drivers approved</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ verification.drivers_approved ?? 0 }}</div>
          <div class="text-[11px] text-slate-400">{{ verificationTotals.drivers }} total</div>
        </div>
      </div>
    </section>
  </div>
</template>
