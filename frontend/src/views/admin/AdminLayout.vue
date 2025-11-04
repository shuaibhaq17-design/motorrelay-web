<script setup>
import { computed, onMounted, provide, reactive, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { fetchAdminDashboard } from '@/services/admin';

const router = useRouter();
const route = useRoute();

const tabs = [
  { name: 'admin-overview', label: 'Overview' },
  { name: 'admin-applications', label: 'Applications' },
  { name: 'admin-conversations', label: 'Conversations' },
  { name: 'admin-account-requests', label: 'Account Updates' },
  { name: 'admin-plans', label: 'Plans & Billing' },
  { name: 'admin-system-health', label: 'System Health' },
  { name: 'admin-content', label: 'Content' }
];

const state = reactive({
  data: null,
  loading: false,
  error: ''
});

const activeTab = computed(() => route.name || 'admin-overview');

async function loadDashboard() {
  state.loading = true;
  state.error = '';
  try {
    const payload = await fetchAdminDashboard();
    state.data = payload || {};
  } catch (error) {
    console.error('Failed to load admin dashboard', error);
    state.error = error.response?.data?.message || 'Unable to load admin data.';
  } finally {
    state.loading = false;
  }
}

function openTab(tabName) {
  if (tabName === activeTab.value) {
    return;
  }
  router.push({ name: tabName });
}

provide(
  'adminDashboard',
  computed(() => state.data || {})
);
provide(
  'adminDashboardLoading',
  computed(() => state.loading)
);
provide('refreshAdminDashboard', loadDashboard);

onMounted(async () => {
  await loadDashboard();
  if (!tabs.some((tab) => tab.name === activeTab.value)) {
    router.replace({ name: 'admin-overview' });
  }
});

watch(
  () => route.name,
  (next) => {
    if (!tabs.some((tab) => tab.name === next)) {
      router.replace({ name: 'admin-overview' });
    }
  }
);
</script>

<template>
  <div class="space-y-6">
    <section class="tile rounded-2xl p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Admin Portal</h1>
          <p class="text-sm text-slate-600">
            Operational control centre for MotorRelay.
          </p>
        </div>
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
        >
          Back to site
        </RouterLink>
      </div>

      <nav class="mt-6 flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="
            tab.name === activeTab
              ? 'bg-emerald-500 text-white shadow'
              : 'bg-white text-emerald-700 border border-emerald-100 hover:bg-emerald-50'
          "
          @click="openTab(tab.name)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </section>

    <section class="space-y-4">
      <div
        v-if="state.error"
        class="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
      >
        <div class="font-semibold">Unable to load admin data</div>
        <p class="mt-1">{{ state.error }}</p>
        <button
          type="button"
          class="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          @click="loadDashboard"
        >
          Retry
        </button>
      </div>

      <div
        v-else-if="state.loading && !state.data"
        class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
      >
        Loading admin insights...
      </div>

      <RouterView v-else :key="activeTab" />
    </section>
  </div>
</template>
