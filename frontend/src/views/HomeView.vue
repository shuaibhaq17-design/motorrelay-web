<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { fetchJobHighlights } from '@/services/jobs';
import { RouterLink } from 'vue-router';

const defaultUpdates = [
  '🔧 Improved job matching accuracy',
  '💸 This week: 10% off delivery fees (Fri-Sun)',
  '🗺️ Live tracking accuracy upgrades',
  '🗓️ Tip: Use job # to search',
  '🛡️ New fraud checks for payouts'
];

const demoJobs = [
  { id: 'demo-1', price: 72, pickup_label: 'Camden', dropoff_label: 'Croydon' },
  { id: 'demo-2', price: 60, pickup_label: 'Reading', dropoff_label: 'Guildford' },
  { id: 'demo-3', price: 120, pickup_label: 'Leeds', dropoff_label: 'Bradford' }
];

const quickLinks = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/messages', label: 'Messages' },
  { to: '/planner', label: 'Planner' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/profile', label: 'Profile' }
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

const filteredQuickLinks = computed(() => {
  return quickLinks.filter((item) => {
    if (item.to !== '/planner') return true;
    return auth.hasPlannerAccess;
  });
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
              class="tile inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-white shadow-sm hover:bg-emerald-600"
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

      <aside class="tile flex flex-col rounded-2xl border bg-white p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="font-bold text-slate-900">Start earning today</div>
          <span class="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Drivers &amp; Dealers</span>
        </div>
        <p class="text-sm text-slate-600">
          See jobs near you and sign up in minutes.
        </p>

        <div class="my-3 max-h-48 space-y-2 overflow-y-auto pr-1">
          <div
            v-for="job in jobsToDisplay"
            :key="job.id"
            class="flex items-center justify-between rounded-xl border bg-white/80 p-3"
          >
            <div>
              <div class="font-semibold text-slate-900">
                {{ priceFormatter.format(Number(job.price ?? 0)) }}
              </div>
              <div class="text-xs text-slate-500">
                {{ job.pickup_label || 'Pickup' }}
                <span aria-hidden="true" class="px-1 text-slate-300">→</span>
                {{ job.dropoff_label || 'Drop-off' }}
              </div>
            </div>
            <RouterLink
              :to="`/jobs/${job.id}`"
              class="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              View
            </RouterLink>
          </div>
        </div>

        <div v-if="!auth.isAuthenticated" class="mt-auto space-y-2 pt-3">
          <RouterLink
            to="/signup"
            class="block w-full rounded-xl bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Sign up
          </RouterLink>
          <RouterLink
            to="/login"
            class="block w-full rounded-xl border px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Login
          </RouterLink>
        </div>

        <div class="mt-4 rounded-2xl border p-3">
          <div class="mb-1 font-semibold text-slate-900">Updates</div>
          <ul class="space-y-1 text-sm text-slate-600">
            <li v-for="(item, idx) in defaultUpdates" :key="idx">
              {{ item }}
            </li>
          </ul>
        </div>
      </aside>
    </section>

    <section class="grid gap-3 md:grid-cols-4">
      <RouterLink
        v-for="item in filteredQuickLinks"
        :key="item.to"
        :to="item.to"
        class="tile rounded-2xl border bg-white px-4 py-3 text-left font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
      >
        {{ item.label }}
      </RouterLink>
    </section>
  </div>
</template>
