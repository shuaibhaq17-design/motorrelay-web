<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { fetchJob, fetchJobApplications, updateJobApplication } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();

const job = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const applications = ref([]);
const applicationsLoading = ref(false);
const applicationsError = ref('');

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

  await loadApplicationsIfNeeded();
}

async function loadApplicationsIfNeeded() {
  if (!job.value || !canReviewApplications.value) {
    applications.value = [];
    return;
  }

  applicationsLoading.value = true;
  applicationsError.value = '';
  try {
    const payload = await fetchJobApplications(job.value.id);
    applications.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error('Failed to load applications', error);
    applicationsError.value = 'Unable to load applications right now.';
    applications.value = [];
  } finally {
    applicationsLoading.value = false;
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
  const status = String(job.value.status || '').toLowerCase();

  if (status === 'open') {
    return 'This job is open and awaiting driver applications.';
  }

  if (['pending', 'accepted', 'in_progress', 'collected', 'in_transit'].includes(status)) {
    if (assignedDriver.value) {
      return `This job is currently in progress with ${assignedDriver.value.name}.`;
    }
    return 'This job is being prepared and will be assigned shortly.';
  }

  if (['delivered', 'completed', 'closed'].includes(status)) {
    if (assignedDriver.value) {
      return `This job was completed by ${assignedDriver.value.name}.`;
    }
    return 'This job has been completed.';
  }

  if (status === 'cancelled') {
    return 'This job has been cancelled.';
  }

  return `This job status is ${job.value.status}.`;
});

const myApplication = computed(() => job.value?.my_application ?? null);
const canReviewApplications = computed(() => {
  if (!job.value || !auth.user) return false;
  return auth.role === 'admin' || job.value.posted_by_id === auth.user.id;
});

async function handleApplicationDecision(applicationId, status) {
  if (!job.value) return;
  try {
    await updateJobApplication(job.value.id, applicationId, { status });
    await loadJob();
    await loadApplicationsIfNeeded();
  } catch (error) {
    console.error('Failed to update application', error);
    alert(error.response?.data?.message || 'Unable to update application. Please try again.');
  }
}
</script>

<template>
  <div class="space-y-4">
    <RouterLink to="/jobs" class="text-sm font-semibold text-emerald-600 hover:underline">
      Back to jobs
    </RouterLink>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading job...
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
            {{ job.company || 'Customer' }} - {{ job.vehicle_make || 'Vehicle' }}
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
          <p class="text-sm text-slate-600">{{ job.pickup_postcode || '--' }}</p>
          <p class="mt-3 text-sm text-slate-500">{{ job.pickup_notes || 'No pickup notes provided.' }}</p>
        </div>

        <div class="tile p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Drop-off</h2>
          <p class="text-lg font-bold text-slate-900">{{ job.dropoff_label || 'Drop-off location' }}</p>
          <p class="text-sm text-slate-600">{{ job.dropoff_postcode || '--' }}</p>
          <p class="mt-3 text-sm text-slate-500">{{ job.dropoff_notes || 'No delivery notes provided.' }}</p>
        </div>

        <div class="tile space-y-2 p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Distance</span>
            <span class="text-base font-semibold text-slate-900">
              {{ job.distance_mi ? `${job.distance_mi} mi` : '--' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Vehicle type</span>
            <span class="text-base font-semibold text-slate-900">{{ job.vehicle_type || '--' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-500">Created</span>
            <span class="text-base font-semibold text-slate-900">
              {{ job.created_at ? new Date(job.created_at).toLocaleString() : '--' }}
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

      <section v-if="myApplication && !canReviewApplications" class="tile space-y-3 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Your application</h2>
        <p class="text-sm text-slate-600">
          Status:
          <span class="font-semibold text-slate-900">{{ myApplication.status }}</span>
          <span v-if="myApplication.responded_at" class="text-xs text-slate-500">
            (updated {{ new Date(myApplication.responded_at).toLocaleString() }})
          </span>
        </p>
        <p class="text-sm text-slate-600" v-if="myApplication.message">
          Your note: {{ myApplication.message }}
        </p>
        <p class="text-xs text-slate-500">
          The dealer will review applications and confirm the assignment. You will be notified when selected.
        </p>
      </section>

      <section v-if="canReviewApplications" class="tile space-y-4 p-4">
        <header class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Driver applications</h2>
            <p class="text-xs text-slate-500">
              Review pending applications and choose a driver. The selected driver will receive messaging access.
            </p>
          </div>
          <span class="badge bg-slate-100 text-slate-800">{{ applications.length }} total</span>
        </header>

        <div v-if="applicationsLoading" class="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          Loading applications...
        </div>

        <div
          v-else-if="applicationsError"
          class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
        >
          {{ applicationsError }}
        </div>

        <div v-else-if="!applications.length" class="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          No driver applications yet.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="application in applications"
            :key="application.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ application.driver?.name || 'Driver' }}
                </p>
                <p class="text-xs text-slate-500">
                  Applied {{ new Date(application.created_at).toLocaleString() }}
                </p>
              </div>
              <span
                class="badge"
                :class="{
                  'bg-emerald-100 text-emerald-700': application.status === 'accepted',
                  'bg-amber-100 text-amber-700': application.status === 'pending',
                  'bg-slate-200 text-slate-700': application.status === 'declined'
                }"
              >
                {{ application.status }}
              </span>
            </div>

            <p v-if="application.message" class="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              "{{ application.message }}"
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                :disabled="application.status !== 'pending'"
                @click="handleApplicationDecision(application.id, 'declined')"
              >
                Decline
              </button>
              <button
                type="button"
                class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                :disabled="application.status !== 'pending'"
                @click="handleApplicationDecision(application.id, 'accepted')"
              >
                Accept and assign
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
