<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { fetchJobs, applyForJob } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const jobs = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const appliedJobIds = ref(new Set());

const fallbackJobs = [
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
];

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

async function loadJobs() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await fetchJobs({ scope: 'available' });
    const rawJobs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.jobs) ? payload.jobs : [];
    jobs.value = rawJobs.filter((job) => String(job.status || '').toLowerCase() === 'open');
    if (!jobs.value.length) {
      jobs.value = fallbackJobs;
    }

    if (auth.role === 'driver') {
      const appliedIds = jobs.value
        .filter((job) => job.my_application && job.my_application.status !== 'declined')
        .map((job) => job.id);
      appliedJobIds.value = new Set(appliedIds);
    }
  } catch (error) {
    console.error('Failed to load jobs', error);
    errorMessage.value = 'Unable to load jobs. Showing sample data.';
    jobs.value = fallbackJobs;
  } finally {
    loading.value = false;
  }
}

async function handleApply(job) {
  if (appliedJobIds.value.has(job.id)) return;

  try {
    await applyForJob(job.id);
    appliedJobIds.value = new Set([...appliedJobIds.value, job.id]);
  } catch (error) {
    console.error('Job application failed', error);
    alert(error.response?.data?.message || 'We could not submit your application. Please try again.');
  }
}

function openJob(job) {
  router.push({ name: 'job-detail', params: { id: job.id } });
}

const visibleJobs = computed(() => jobs.value ?? []);
const isDriver = computed(() => auth.role === 'driver');
function hasApplied(jobId) {
  return appliedJobIds.value.has(jobId);
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadJobs();
});
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
              {{ job.company || 'Customer' }} - {{ job.vehicle_make || 'Vehicle' }} - {{ job.distance_mi ?? '--' }} mi
            </p>
            <p class="text-xs text-slate-500">
              {{ job.pickup_postcode || '??' }} -> {{ job.dropoff_postcode || '??' }}
            </p>
          </div>
          <span
            class="badge bg-slate-100 text-slate-800"
          >
            {{ job.status }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-if="isDriver"
            type="button"
            class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="hasApplied(job.id)"
            @click.stop="handleApply(job)"
          >
            <span v-if="hasApplied(job.id)">Application sent</span>
            <span v-else>Request this job</span>
          </button>
        </div>
      </button>
    </div>
  </div>
</template>






