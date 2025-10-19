<script setup>
import { computed, onMounted, ref, reactive } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { fetchJobs, applyForJob, cancelJob, markJobDelivered, sendJobInvoice } from '@/services/jobs';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const availableJobs = ref([]);
const activeJobs = ref([]);
const completedJobs = ref([]);
const availableLoading = ref(false);
const activeLoading = ref(false);
const completedLoading = ref(false);
const errorMessage = ref('');
const activeErrorMessage = ref('');
const completedErrorMessage = ref('');
const successMessage = ref('');
const appliedJobIds = ref(new Set());
const actionState = reactive({
  id: null,
  type: null
});
const confirmDialog = reactive({
  open: false,
  job: null,
  mode: null,
  message: '',
  pending: false,
  note: ''
});

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

async function loadJobs() {
  successMessage.value = '';
  availableLoading.value = true;
  if (showActiveSection.value) {
    activeLoading.value = true;
  } else {
    activeLoading.value = false;
    activeJobs.value = [];
  }
  if (showCompletedSection.value) {
    completedLoading.value = true;
  } else {
    completedLoading.value = false;
    completedJobs.value = [];
  }
  errorMessage.value = '';
  activeErrorMessage.value = '';
  completedErrorMessage.value = '';
  try {
    const payload = await fetchJobs({ scope: 'available' });
    const rawJobs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.jobs) ? payload.jobs : [];
    const openJobs = rawJobs.filter((job) => String(job.status || '').toLowerCase() === 'open');
    availableJobs.value = openJobs;

    if (isDriver.value) {
      const appliedIds = availableJobs.value
        .filter((job) => job.my_application && job.my_application.status !== 'declined')
        .map((job) => job.id);
      appliedJobIds.value = new Set(appliedIds);
    }
  } catch (error) {
    console.error('Failed to load jobs', error);
    errorMessage.value = 'Unable to load jobs right now.';
    availableJobs.value = [];
  } finally {
    availableLoading.value = false;
  }

  if (showActiveSection.value) {
    try {
      const payload = await fetchJobs({ scope: 'current' });
      const rawJobs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.jobs) ? payload.jobs : [];
      activeJobs.value = rawJobs;
    } catch (error) {
      console.error('Failed to load active jobs', error);
      activeErrorMessage.value = 'We could not load active jobs right now.';
      activeJobs.value = [];
    } finally {
      activeLoading.value = false;
    }
  }

  if (!showCompletedSection.value) {
    return;
  }

  try {
    const payload = await fetchJobs({ scope: 'completed' });
    const rawJobs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.jobs) ? payload.jobs : [];
    completedJobs.value = rawJobs;
  } catch (error) {
    console.error('Failed to load completed jobs', error);
    completedErrorMessage.value = 'We could not load completed jobs right now.';
    completedJobs.value = [];
  } finally {
    completedLoading.value = false;
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

const visibleJobs = computed(() => availableJobs.value ?? []);
const isDriver = computed(() => auth.role === 'driver');
const isDealer = computed(() => auth.role === 'dealer');
const isAdmin = computed(() => auth.role === 'admin');
const showActiveSection = computed(() => isDriver.value || isDealer.value || isAdmin.value);
const showCompletedSection = computed(() => isDriver.value || isDealer.value || isAdmin.value);

function hasApplied(jobId) {
  return appliedJobIds.value.has(jobId);
}

function isActionPending(jobId, type) {
  return actionState.id === jobId && actionState.type === type;
}

async function handleCancelJob(job) {
  openConfirmDialog(job, 'cancel');
}

async function handleMarkDelivered(job) {
  openConfirmDialog(job, 'deliver');
}

function openConfirmDialog(job, mode) {
  confirmDialog.job = job;
  confirmDialog.mode = mode;
  confirmDialog.open = true;
  confirmDialog.pending = false;

  if (mode === 'deliver') {
    confirmDialog.message = 'Mark this job as delivered? The dealer will be notified.';
  } else if (mode === 'invoice') {
    confirmDialog.message = 'Send the invoice for this job to the dealer? They will be able to download it immediately.';
  } else {
    confirmDialog.message = isDriver.value
      ? 'Cancel this job? It will return to the board for other drivers. Add an optional note below.'
      : 'Cancel this job? This will withdraw the job from the assigned driver and close it. Add an optional note below.';
  }

  confirmDialog.note = '';
}

async function confirmAction() {
  if (!confirmDialog.job || !confirmDialog.mode) return;

  confirmDialog.pending = true;
  actionState.id = confirmDialog.job.id;
  actionState.type = confirmDialog.mode;

  try {
    let message = '';
    if (confirmDialog.mode === 'deliver') {
      await markJobDelivered(confirmDialog.job.id);
      message = 'Job marked as delivered.';
    } else if (confirmDialog.mode === 'invoice') {
      await sendJobInvoice(confirmDialog.job.id);
      message = 'Invoice sent to the dealer.';
    } else {
      const payload = confirmDialog.note ? { reason: confirmDialog.note } : {};
      await cancelJob(confirmDialog.job.id, payload);
      message = 'Job cancelled.';
    }
    await loadJobs();
    successMessage.value = message;
    closeConfirmDialog();
  } catch (error) {
    console.error('Job action failed', error);
    alert(error.response?.data?.message || 'We could not complete this action. Please try again.');
    confirmDialog.pending = false;
  } finally {
    actionState.id = null;
    actionState.type = null;
  }
}

function closeConfirmDialog() {
  confirmDialog.open = false;
  confirmDialog.job = null;
  confirmDialog.mode = null;
  confirmDialog.message = '';
  confirmDialog.note = '';
  confirmDialog.pending = false;
}

function formatShortDate(value) {
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

function formatTransportType(value) {
  const normalized = (value || '').toString().toLowerCase();
  if (normalized === 'trailer') {
    return 'Trailer';
  }
  if (normalized === 'drive_away') {
    return 'Drive-away';
  }
  if (!value) {
    return '--';
  }
  return value;
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

    <p
      v-if="successMessage"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
    >
      {{ successMessage }}
    </p>

    <div v-if="availableLoading && !activeLoading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading jobs&hellip;
    </div>

    <section v-if="showActiveSection" class="space-y-3">
      <header class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">
          {{ isDriver ? 'Your active jobs' : 'Active jobs' }}
        </h2>
        <RouterLink v-if="isDriver" to="/driver" class="text-xs font-semibold text-emerald-600 hover:underline">
          Driver dashboard
        </RouterLink>
      </header>

      <p v-if="activeErrorMessage" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        {{ activeErrorMessage }}
      </p>

      <div v-if="activeLoading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
        Loading your active jobs...
      </div>
      <div v-else-if="!activeJobs.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        You have no active jobs right now.
      </div>
      <div v-else class="grid gap-3">
        <article
          v-for="job in activeJobs"
          :key="`active-${job.id}`"
          class="tile flex flex-col gap-3 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-lg font-semibold text-slate-900">
                {{ job.title || `Job #${job.id}` }}
              </p>
              <p class="text-sm text-slate-600">
                {{ job.pickup_postcode || '--' }} -> {{ job.dropoff_postcode || '--' }}
              </p>
              <p class="text-xs text-slate-500">
                Transport: {{ formatTransportType(job.transport_type) }}
              </p>
              <p class="text-xs text-slate-500">
                <template v-if="isDriver">
                  {{ job.posted_by?.name ? `Dealer: ${job.posted_by.name}` : 'Dealer' }}
                </template>
                <template v-else>
                  <span v-if="job.assigned_to?.name">Driver: {{ job.assigned_to.name }}</span>
                  <span v-else>Awaiting driver assignment</span>
                </template>
              </p>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-emerald-600">
                {{ priceFormatter.format(Number(job.price ?? 0)) }}
              </div>
              <span class="badge bg-emerald-100 text-emerald-700">{{ job.status }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              @click="openJob(job)"
            >
              View details
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              :disabled="isActionPending(job.id, 'cancel')"
              @click="handleCancelJob(job)"
            >
              <span v-if="isActionPending(job.id, 'cancel')">Cancelling...</span>
              <span v-else>Cancel job</span>
            </button>
            <button
              v-if="isDriver"
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              :disabled="isActionPending(job.id, 'deliver')"
              @click="handleMarkDelivered(job)"
            >
              <span v-if="isActionPending(job.id, 'deliver')">Updating...</span>
              <span v-else>Mark as delivered</span>
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="showCompletedSection" class="space-y-3">
      <header class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">
          {{ isDriver ? 'Completed jobs' : 'Recent completed jobs' }}
        </h2>
        <span class="text-xs font-semibold text-slate-500">
          {{ completedJobs.length }} total
        </span>
      </header>

      <p v-if="completedErrorMessage" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        {{ completedErrorMessage }}
      </p>

      <div v-if="completedLoading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
        Loading completed jobs...
      </div>
      <div
        v-else-if="!completedJobs.length"
        class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        No completed jobs yet.
      </div>
      <div v-else class="grid gap-3 md:grid-cols-2">
        <article
          v-for="job in completedJobs"
          :key="`completed-${job.id}`"
          class="tile flex flex-col gap-3 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-lg font-semibold text-slate-900">
                {{ job.title || `Job #${job.id}` }}
              </p>
                <p class="text-sm text-slate-600">
                  {{ job.pickup_postcode || '--' }} -> {{ job.dropoff_postcode || '--' }}
                </p>
                <p class="text-xs text-slate-500">
                  Completed {{ formatShortDate(job.completed_at || job.updated_at) }}
                </p>
                <p class="text-xs text-slate-500" v-if="job.assigned_to?.name">
                  Driver: {{ job.assigned_to.name }}
                </p>
                <p class="text-xs text-slate-500" v-else-if="job.posted_by?.name">
                  Dealer: {{ job.posted_by.name }}
                </p>
                <p
                  v-if="job.finalized_invoice_id"
                  class="text-xs font-semibold text-emerald-600"
                >
                  Invoice {{ job.finalized_invoice?.number || job.finalized_invoice_id }} sent
                </p>
                <p
                  v-else-if="!isDriver"
                  class="text-xs text-amber-600"
                >
                  Awaiting driver invoice
                </p>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-emerald-600">
                  {{ priceFormatter.format(Number(job.price ?? 0)) }}
                </div>
              <span class="badge bg-slate-200 text-slate-700">{{ job.status }}</span>
            </div>
          </div>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="openJob(job)"
              >
                View details
              </button>
              <button
                v-if="isDriver && !job.finalized_invoice_id"
                type="button"
                class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                :disabled="isActionPending(job.id, 'invoice')"
                @click="openConfirmDialog(job, 'invoice')"
              >
                <span v-if="isActionPending(job.id, 'invoice')">Sending...</span>
                <span v-else>Send invoice</span>
              </button>
              <RouterLink
                v-if="job.finalized_invoice_id"
                :to="{ name: 'invoices' }"
                class="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                View invoice
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

    <section class="space-y-3">
      <header class="flex items-center justify-between" v-if="isDriver">
        <h2 class="text-lg font-semibold text-slate-900">Available jobs</h2>
        <span class="text-xs font-semibold text-slate-500">
          {{ visibleJobs.length }} listed
        </span>
      </header>

      <div v-if="availableLoading && !visibleJobs.length" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
        Loading jobs...
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
                {{ job.company || 'Customer' }} - {{ job.vehicle_make || 'Vehicle' }}
              </p>
              <p class="text-xs text-slate-500">
                {{ job.pickup_postcode || '--' }} -> {{ job.dropoff_postcode || '--' }}
              </p>
              <p class="text-xs text-slate-500">
                Transport: {{ formatTransportType(job.transport_type) }}
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
    </section>
  </div>

  <div
    v-if="confirmDialog.open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h3 class="text-lg font-semibold text-slate-900">
        {{
          confirmDialog.mode === 'deliver'
            ? 'Mark job as delivered'
            : confirmDialog.mode === 'invoice'
            ? 'Send invoice'
            : 'Cancel job'
        }}
      </h3>
      <p class="mt-3 text-sm text-slate-600">
        {{ confirmDialog.message }}
      </p>

      <div v-if="confirmDialog.mode === 'cancel'" class="mt-4 space-y-2">
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Optional note
        </label>
        <textarea
          v-model="confirmDialog.note"
          rows="3"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="Let them know why you're cancelling"
        ></textarea>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          :disabled="confirmDialog.pending"
          @click="closeConfirmDialog"
        >
          Close
        </button>
        <button
          type="button"
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          :disabled="confirmDialog.pending"
          @click="confirmAction"
        >
          <span v-if="confirmDialog.pending">Working...</span>
          <span v-else>Confirm</span>
        </button>
      </div>
    </div>
  </div>
</template>











