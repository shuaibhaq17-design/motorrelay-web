<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { fetchJobs, mutateJob } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const tab = ref('available');
const jobs = ref([]);
const loading = ref(false);
const errorMessage = ref('');

const fallbackJobs = {
  available: [
    {
      id: 'demo-1',
      price: 72,
      status: 'open',
      company: 'Acme Motors',
      vehicle_make: 'Ford Fiesta',
      distance_mi: 12,
      pickup_postcode: 'NW1',
      dropoff_postcode: 'CR0'
    }
  ],
  current: [
    {
      id: 'demo-2',
      price: 105,
      status: 'in_transit',
      company: 'City Cars',
      vehicle_make: 'BMW 1 Series',
      distance_mi: 46,
      pickup_postcode: 'SW1',
      dropoff_postcode: 'CB1'
    }
  ],
  completed: [
    {
      id: 'demo-3',
      price: 88,
      status: 'delivered',
      company: 'Midlands Auto',
      vehicle_make: 'Audi A3',
      distance_mi: 30,
      pickup_postcode: 'B1',
      dropoff_postcode: 'LE1'
    }
  ]
};

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

async function loadJobs() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await fetchJobs({ scope: tab.value });
    jobs.value = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.jobs) ? payload.jobs : [];
    if (!jobs.value.length) {
      jobs.value = fallbackJobs[tab.value] ?? [];
    }
  } catch (error) {
    console.error('Failed to load jobs', error);
    errorMessage.value = 'Unable to load jobs. Showing sample data.';
    jobs.value = fallbackJobs[tab.value] ?? [];
  } finally {
    loading.value = false;
  }
}

async function handleAction(job, action) {
  try {
    await mutateJob(job.id, action);
    await loadJobs();
  } catch (error) {
    console.error('Job mutation failed', error);
    alert('We could not update this job. Please try again.');
  }
}

function openJob(job) {
  router.push({ name: 'job-detail', params: { id: job.id } });
}

const visibleJobs = computed(() => jobs.value ?? []);

const tabs = [
  { key: 'available', label: 'Available' },
  { key: 'current', label: 'Current' },
  { key: 'completed', label: 'Completed' }
];

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadJobs();
});

watch(tab, loadJobs);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Jobs</h1>
        <p class="text-sm text-slate-600">Review and manage MotorRelay runs.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          v-if="auth.isDealer || auth.role === 'admin'"
          to="/jobs/new"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          + Create Job
        </RouterLink>

        <RouterLink
          v-if="auth.hasPlannerAccess"
          to="/planner"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Planner
        </RouterLink>

        <div class="inline-flex overflow-hidden rounded-2xl border border-slate-200">
          <button
            v-for="item in tabs"
            :key="item.key"
            type="button"
            class="px-3 py-2 text-sm font-semibold transition"
            :class="tab === item.key ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'"
            @click="tab = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading jobs&hellip;
    </div>

    <div v-else-if="!visibleJobs.length" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      No jobs here yet.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <button
        v-for="job in visibleJobs"
        :key="job.id"
        type="button"
        class="tile w-full cursor-pointer text-left p-4 transition hover:-translate-y-0.5 hover:shadow-md"
        @click="openJob(job)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-slate-900">
              {{ priceFormatter.format(Number(job.price ?? 0)) }}
            </div>
            <p class="text-sm text-slate-600">
              {{ job.company || 'Customer' }} · {{ job.vehicle_make || 'Vehicle' }} ·
              {{ job.distance_mi || '—' }} mi
            </p>
            <p class="text-xs text-slate-500">
              {{ job.pickup_postcode || '??' }} → {{ job.dropoff_postcode || '??' }}
            </p>
          </div>
          <span
            class="badge bg-slate-100 text-slate-800"
          >
            {{ job.status }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <RouterLink
            v-if="tab === 'current' || tab === 'completed'"
            :to="{ name: 'job-detail', params: { id: job.id } }"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Open
          </RouterLink>

          <button
            v-if="tab === 'available' && !auth.isDealer"
            type="button"
            class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            @click.stop="handleAction(job, 'accept')"
          >
            Pick this job
          </button>

          <button
            v-if="tab === 'current'"
            type="button"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            @click.stop="handleAction(job, 'collected')"
          >
            Collected
          </button>

          <button
            v-if="tab === 'current'"
            type="button"
            class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            @click.stop="handleAction(job, 'delivered')"
          >
            Job completed
          </button>

          <button
            v-if="tab === 'current'"
            type="button"
            class="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            @click.stop="handleAction(job, 'cancel')"
          >
            Cancel
          </button>

          <RouterLink
            v-if="tab === 'completed'"
            :to="`/invoices/from-job/${job.id}`"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            View invoice
          </RouterLink>
        </div>
      </button>
    </div>
  </div>
</template>
