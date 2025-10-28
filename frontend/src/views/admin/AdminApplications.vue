<script setup>
import { computed, inject, ref } from 'vue';

const dashboard = inject('adminDashboard');
const applications = computed(() => dashboard?.value?.applications || {});

const tabs = [
  { key: 'dealerships', label: 'Dealerships' },
  { key: 'drivers', label: 'Drivers' }
];

const activeTab = ref('dealerships');

const rows = computed(() => {
  const list = applications.value?.[activeTab.value];
  return Array.isArray(list) ? list : [];
});

function setTab(key) {
  activeTab.value = key;
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString();
}
</script>

<template>
  <div class="tile rounded-2xl bg-white p-6">
    <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Account applications</h2>
        <p class="text-sm text-slate-600">Approve or decline new MotorRelay accounts.</p>
      </div>

      <div class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
          :class="tab.key === activeTab ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600'"
          @click="setTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div class="mt-6">
      <div
        v-if="!rows.length"
        class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500"
      >
        No applications found.
      </div>

      <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Name</th>
              <th class="px-4 py-3 font-semibold">Job</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 font-semibold">Submitted</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.id">
              <td class="px-4 py-3 font-medium text-slate-900">{{ row.driver }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.job_title || 'Job' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
                  {{ row.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-500">
                {{ formatDate(row.submitted_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
