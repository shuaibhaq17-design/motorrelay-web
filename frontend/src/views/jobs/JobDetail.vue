<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { fetchJob } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();

const job = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

async function loadJob() {
  const jobId = route.params.id;
  if (!jobId) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await fetchJob(jobId);
    job.value = payload?.data ?? payload ?? null;
  } catch (error) {
    console.error('Failed to load job', error);
    errorMessage.value = 'We could not load this job.';
    job.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadJob();
});

watch(
  () => route.params.id,
  () => {
    loadJob();
  }
);

const assignedDriver = computed(() => job.value?.assigned_to ?? null);
const statusDescription = computed(() => {
  if (!job.value) return '';
  if (job.value.status === 'open') {
    return 'This job is open and awaiting acceptance by a driver.';
  }

  if (job.value.status === 'accepted' || job.value.status === 'collected' || job.value.status === 'in_transit') {
    if (assignedDriver.value) {
      return `This job has been accepted by ${assignedDriver.value.name}.`;
    }
    return 'This job has been accepted by a driver.';
  }

  if (job.value.status === 'delivered' || job.value.status === 'completed') {
    if (assignedDriver.value) {
      return `This job was completed by ${assignedDriver.value.name}.`;
    }
    return 'This job has been completed.';
  }

  if (job.value.status === 'cancelled') {
    return 'This job has been cancelled.';
  }

  return `This job status is ${job.value.status}.`;
});
</script>

<template>
  <div class="space-y-4">
    <RouterLink to="/jobs" class="text-sm font-semibold text-emerald-600 hover:underline">
      ← Back to jobs
    </RouterLink>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading job&hellip;
    </div>

    <div v-else-if="errorMessage" class="rounded-2xl border bg-white p-4 text-sm text-amber-600">
      {{ errorMessage }}
    </div>

    <div v-else-if="!job" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Job not found.
    </div>

    <div v-else class="space-y-4">
      <header class="flex flex-col items-start justify-between gap-3 rounded-2xl border bg-white p-6 md:flex-row md:items-center">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            {{ job.title || `Job #${job.id}` }}
          </h1>
          <p class="text-sm text-slate-600">
            {{ job.company || 'Customer' }} · {{ job.vehicle_make || 'Vehicle' }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-extrabold text-emerald-600">
            {{ priceFormatter.format(Number(job.price ?? 0)) }}
          </div>
          <div class="badge bg-slate-100 text-slate-800">
            {{ job.status }}
          </div>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3">
        <div class="tile p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Pickup</h2>
          <p class="text-lg font-bold text-slate-900">{{ job.pickup_label || 'Pickup location' }}</p>
          <p class="text-sm text-slate-600">{{ job.pickup_postcode || '—' }}</p>
          <p class="mt-3 text-sm text-slate-500">{{ job.pickup_notes || 'No pickup notes provided.' }}</p>
        </div>

        <div class="tile p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Drop-off</h2>
          <p class="text-lg font-bold text-slate-900">{{ job.dropoff_label || 'Drop-off location' }}</p>
          <p class="text-sm text-slate-600">{{ job.dropoff_postcode || '—' }}</p>
          <p class="mt-3 text-sm text-slate-500">{{ job.dropoff_notes || 'No delivery notes provided.' }}</p>
        </div>

        <div class="tile p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Distance</span>
            <span class="text-base font-semibold text-slate-900">
              {{ job.distance_mi ? `${job.distance_mi} mi` : '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Vehicle type</span>
            <span class="text-base font-semibold text-slate-900">{{ job.vehicle_type || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Created</span>
            <span class="text-base font-semibold text-slate-900">
              {{ job.created_at ? new Date(job.created_at).toLocaleString() : '—' }}
            </span>
          </div>
        </div>
      </section>

      <section class="tile p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Status</h2>

        <p class="mt-2 text-sm text-slate-600">
          {{ statusDescription }}
        </p>

        <div class="mt-4 space-y-2">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="job-driver-select">
            Assigned driver
          </label>
          <select
            id="job-driver-select"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            disabled
          >
            <option v-if="assignedDriver" :value="assignedDriver.id">
              {{ assignedDriver.name }} ({{ assignedDriver.email }})
            </option>
            <option v-else value="unassigned">
              No driver assigned
            </option>
          </select>
        </div>
      </section>
    </div>
  </div>
</template>
