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

function jobIsAwaitingLive(job) {
  if (!job?.goes_live_at) return false;
  const date = new Date(job.goes_live_at);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

function formatGoLive(job) {
  if (!jobIsAwaitingLive(job)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(job.goes_live_at));
}

const visibleJobs = computed(() => availableJobs.value ?? []);
const isDriver = computed(() => auth.role === 'driver');
const isDealer = computed(() => auth.role === 'dealer');
const isAdmin = computed(() => auth.role === 'admin');
const showActiveSection = computed(() => isDriver.value || isDealer.value || isAdmin.value);
const showCompletedSection = computed(() => false);
const dealerPipelineJobs = computed(() => {
  const byId = new Map();
  [...availableJobs.value, ...activeJobs.value].forEach((job) => {
    if (job?.id) byId.set(job.id, job);
  });

  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a?.created_at ?? a?.pickup_ready_at ?? 0).getTime();
    const bTime = new Date(b?.created_at ?? b?.pickup_ready_at ?? 0).getTime();
    return bTime - aTime;
  });
});
const mainJobs = computed(() => {
  if (isDealer.value) return dealerPipelineJobs.value;
  return activeJobs.value;
});
const dealerStats = computed(() => ({
  total: dealerPipelineJobs.value.length,
  awaitingDriver: dealerPipelineJobs.value.filter((job) => !job?.assigned_to_id).length,
  needsPayment: dealerPipelineJobs.value.filter((job) => job?.assigned_to_id && !['paid', 'payout_released'].includes(String(job?.payment_status || 'unpaid').toLowerCase())).length,
  proofReview: dealerPipelineJobs.value.filter((job) => String(job?.completion_status || 'not_submitted').toLowerCase() === 'submitted').length,
  payoutReady: dealerPipelineJobs.value.filter((job) => {
    const paymentStatus = String(job?.payment_status || 'unpaid').toLowerCase();
    const completionStatus = String(job?.completion_status || 'not_submitted').toLowerCase();
    return paymentStatus === 'paid' && completionStatus === 'approved' && !job?.stripe_transfer_id;
  }).length
}));
const pageIntro = computed(() => {
  if (isDriver.value) {
    return {
      eyebrow: 'Driver jobs',
      title: 'Find and manage jobs',
      text: 'Request open runs, wait for dealer assignment, then complete delivery and proof.'
    };
  }

  if (isDealer.value) {
    return {
      eyebrow: 'Dealer jobs',
      title: 'Jobs command centre',
      text: 'Post jobs, choose drivers, collect payment, approve proof, and release payout.'
    };
  }

  return {
    eyebrow: 'Marketplace',
    title: 'Jobs',
    text: 'Review, request, assign, and complete MotorRelay runs.'
  };
});
const processSteps = computed(() => {
  if (isDriver.value) {
    return ['Request job', 'Dealer assigns driver', 'Deliver vehicle', 'Upload delivery proof'];
  }

  if (isDealer.value) {
    return ['Post job', 'Choose driver', 'Take payment', 'Approve proof', 'Release payout'];
  }

  return ['Create or request', 'Assign driver', 'Track delivery', 'Close paperwork'];
});
const activeEmptyMessage = computed(() => {
  if (isDriver.value) return 'No assigned jobs yet. Browse available jobs below and request one when you are ready.';
  if (isDealer.value) return 'No dealer jobs yet. Create a job to start receiving driver requests.';
  return 'No active jobs right now.';
});
const availableEmptyMessage = computed(() => {
  if (isDriver.value) return 'No open jobs right now. Check back later or ask a dealer to post a run.';
  if (isDealer.value) return 'No open jobs visible. Create a job to start receiving driver requests.';
  return 'No jobs here yet.';
});

function hasApplied(jobId) {
  return appliedJobIds.value.has(jobId);
}

function dealerNextAction(job) {
  const status = String(job?.status || '').toLowerCase();
  const paymentStatus = String(job?.payment_status || 'unpaid').toLowerCase();
  const completionStatus = String(job?.completion_status || 'not_submitted').toLowerCase();

  if (!job?.assigned_to_id) return 'Review driver requests';
  if (paymentStatus === 'unpaid') return 'Take payment';
  if (paymentStatus === 'checkout_pending') return 'Refresh payment';
  if (completionStatus === 'submitted') return 'Approve delivery proof';
  if (paymentStatus === 'paid' && completionStatus === 'approved' && !job?.stripe_transfer_id) return 'Release driver payout';
  if (paymentStatus === 'payout_released') return 'Paid out';
  if (['in_progress', 'accepted', 'collected', 'in_transit'].includes(status)) return 'Track delivery';
  return 'View job';
}

function paymentLabel(job) {
  const status = String(job?.payment_status || 'unpaid').replace(/_/g, ' ');
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(job) {
  const status = String(job?.status || '').toLowerCase();
  if (status === 'open') return 'bg-emerald-100 text-emerald-700';
  if (['in_progress', 'accepted', 'collected', 'in_transit'].includes(status)) return 'bg-sky-100 text-sky-700';
  if (['completion_pending', 'delivered'].includes(status)) return 'bg-amber-100 text-amber-700';
  if (['completed', 'closed'].includes(status)) return 'bg-slate-900 text-white';
  return 'bg-slate-100 text-slate-700';
}

function paymentClass(job) {
  const status = String(job?.payment_status || 'unpaid').toLowerCase();
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'payout_released') return 'bg-slate-900 text-white';
  if (status === 'checkout_pending') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function canEditDealerJob(job) {
  if (!isDealer.value) return false;
  const status = String(job?.status || '').toLowerCase();
  return !job?.assigned_to_id && ['open', 'pending'].includes(status);
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
  <div :class="isDealer ? 'space-y-5' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'">
    <div class="space-y-4">
    <div
      class="section-card overflow-hidden"
      :class="isDealer ? 'border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-sky-50' : ''"
    >
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{{ pageIntro.eyebrow }}</p>
          <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{{ pageIntro.title }}</h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{{ pageIntro.text }}</p>
        </div>

        <div class="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <RouterLink
            v-if="auth.isDealer || auth.role === 'admin'"
            to="/jobs/new"
            class="btn-primary w-full sm:w-auto"
          >
            Create job
          </RouterLink>

          <RouterLink
            v-if="auth.hasPlannerAccess"
            to="/planner"
            class="btn-secondary w-full sm:w-auto"
          >
            Planner
          </RouterLink>
        </div>
      </div>

      <div v-if="isDealer" class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Active jobs</p>
          <p class="mt-2 text-3xl font-black text-slate-950">{{ dealerStats.total }}</p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Need drivers</p>
          <p class="mt-2 text-3xl font-black text-emerald-950">{{ dealerStats.awaitingDriver }}</p>
        </div>
        <div class="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wide text-sky-700">Need payment</p>
          <p class="mt-2 text-3xl font-black text-sky-950">{{ dealerStats.needsPayment }}</p>
        </div>
        <div class="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Proof review</p>
          <p class="mt-2 text-3xl font-black text-amber-950">{{ dealerStats.proofReview }}</p>
        </div>
        <div class="rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wide text-violet-700">Payout ready</p>
          <p class="mt-2 text-3xl font-black text-violet-950">{{ dealerStats.payoutReady }}</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <section v-if="isDealer" class="section-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-black text-slate-950">Dealer workflow</h2>
          <p class="mt-1 text-sm text-slate-600">Every job should move through these steps.</p>
        </div>
        <ol class="grid gap-2 sm:grid-cols-5 lg:min-w-[720px]">
          <li
            v-for="(step, index) in processSteps"
            :key="step"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700"
          >
            <span class="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white">{{ index + 1 }}</span>
            {{ step }}
          </li>
        </ol>
      </div>
    </section>

    <section v-if="isAdmin" class="section-card">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Simple workflow</h2>
          <p class="text-sm text-slate-600">These are the main steps for your role.</p>
        </div>
        <ol class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="step in processSteps"
            :key="step"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
          >
            {{ step }}
          </li>
        </ol>
      </div>
    </section>

    <section
      v-if="auth.hasPlannerAccess && !isDealer"
      class="section-card"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Planner</h2>
          <p class="text-sm text-slate-600">
            Coordinate routes and reserve driver time before posting or assigning new runs.
          </p>
        </div>
        <RouterLink
          to="/planner"
          class="btn-secondary w-full sm:w-auto"
        >
          Open planner
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>
    </section>

    <p
      v-if="successMessage"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
    >
      {{ successMessage }}
    </p>

    <div v-if="availableLoading && !activeLoading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading jobs&hellip;
    </div>

    <section v-if="showActiveSection" class="section-card space-y-4">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-black text-slate-950">
          {{ isDriver ? 'Your active jobs' : isDealer ? 'Your posted jobs' : 'Active jobs' }}
        </h2>
        <span v-if="isDealer" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {{ mainJobs.length }} active
        </span>
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
      <div v-else-if="!mainJobs.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {{ activeEmptyMessage }}
      </div>
      <div v-else class="space-y-4">
        <article
          v-for="job in mainJobs"
          :key="`active-${job.id}`"
          class="rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5"
          :class="isDealer ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/80 hover:bg-white'"
        >
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div v-if="isDealer" class="mb-3 flex flex-wrap gap-2">
                <span class="badge" :class="statusClass(job)">{{ job.status }}</span>
                <span class="badge" :class="paymentClass(job)">{{ paymentLabel(job) }}</span>
                <span class="badge bg-slate-100 text-slate-700">{{ formatTransportType(job.transport_type) }}</span>
              </div>

              <p class="text-xl font-black text-slate-950">
                {{ job.title || `Job #${job.id}` }}
              </p>

              <div class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div class="rounded-2xl bg-slate-50 p-3">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Route</p>
                  <p class="mt-1 font-semibold text-slate-800">{{ job.pickup_postcode || '--' }} to {{ job.dropoff_postcode || '--' }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-3">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Driver</p>
                  <p class="mt-1 font-semibold text-slate-800">
                    <template v-if="isDriver">
                      {{ job.posted_by?.name || 'Dealer' }}
                    </template>
                    <template v-else>
                      {{ job.assigned_to?.name || 'Not assigned yet' }}
                    </template>
                  </p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-3">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Next action</p>
                  <p class="mt-1 font-semibold text-emerald-700">{{ isDealer ? dealerNextAction(job) : job.status }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-3xl bg-slate-950 p-4 text-white lg:min-w-[180px] lg:text-right">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Job value</p>
              <div class="mt-1 text-3xl font-black">
                {{ priceFormatter.format(Number(job.price ?? 0)) }}
              </div>
              <span v-if="!isDealer" class="badge mt-3 bg-emerald-100 text-emerald-700">{{ job.status }}</span>
            </div>
          </div>

          <div class="mt-4 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              class="btn-primary w-full px-4 py-2 text-sm sm:w-auto"
              @click="openJob(job)"
            >
              {{ isDealer ? 'Manage job' : 'View details' }}
            </button>
            <RouterLink
              v-if="canEditDealerJob(job)"
              :to="`/jobs/${job.id}/edit`"
              class="btn-secondary w-full px-4 py-2 text-sm sm:w-auto"
            >
              Edit job
            </RouterLink>
            <button
              type="button"
              class="btn-secondary w-full px-4 py-2 text-sm disabled:opacity-60 sm:w-auto"
              :disabled="isActionPending(job.id, 'cancel')"
              @click="handleCancelJob(job)"
            >
              <span v-if="isActionPending(job.id, 'cancel')">Cancelling...</span>
              <span v-else>Cancel job</span>
            </button>
            <button
              v-if="isDriver"
              type="button"
              class="btn-primary w-full px-3 py-2 text-xs disabled:opacity-60 sm:w-auto"
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

    <div v-if="isDriver" class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800">
      Looking for historical runs? <RouterLink to="/profile" class="font-semibold text-emerald-600 hover:underline">View completed jobs in your profile</RouterLink>.
    </div>

    <section v-if="isDriver || isAdmin" class="section-card space-y-4">
      <header class="flex items-center justify-between gap-3" v-if="isDriver">
        <h2 class="text-lg font-semibold text-slate-900">Available jobs</h2>
        <span class="text-xs font-semibold text-slate-500">
          {{ visibleJobs.length }} listed
        </span>
      </header>

      <div v-if="availableLoading && !visibleJobs.length" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
        Loading jobs...
      </div>

      <div v-else-if="!visibleJobs.length" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
        {{ availableEmptyMessage }}
      </div>

      <div v-else class="space-y-4">
        <button
          v-for="job in visibleJobs"
          :key="job.id"
          type="button"
          class="w-full cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl sm:p-5"
          @click="openJob(job)"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="text-2xl font-black text-slate-950">
                {{ priceFormatter.format(Number(job.price ?? 0)) }}
              </div>
              <p class="text-sm text-slate-600">
                {{ job.company || 'Customer' }} - {{ job.vehicle_make || 'Vehicle' }}
              </p>
              <p class="text-xs text-slate-500">
                {{ job.pickup_postcode || '--' }} to {{ job.dropoff_postcode || '--' }}
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

          <div class="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              v-if="isDriver"
              type="button"
              class="btn-primary w-full px-4 py-2 text-sm disabled:opacity-60 sm:w-auto"
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

    <aside v-if="!isDealer" class="section-card h-fit space-y-4 lg:sticky lg:top-24">
      <h2 class="text-sm font-semibold text-slate-900">
        {{ isDealer ? 'Dealer workflow' : 'Job tips' }}
      </h2>
      <p class="text-sm text-slate-600">
        <template v-if="isDealer">
          Create a job, choose a driver, take payment, approve proof, then release payout.
        </template>
        <template v-else>
          Keep your pipeline organised: drivers upload delivery proof, then dealers approve completion and download invoices.
        </template>
      </p>
      <RouterLink
        v-if="isDealer"
        to="/jobs/new"
        class="btn-primary w-full"
      >
        Create job
      </RouterLink>
      <RouterLink
        to="/profile/completed"
        class="btn-secondary w-full border-emerald-200 bg-emerald-50 text-emerald-700"
      >
        View completed jobs
      </RouterLink>
      <RouterLink
        v-if="auth.hasPlannerAccess"
        to="/planner"
        class="btn-secondary w-full text-xs"
      >
        Open planner
      </RouterLink>
    </aside>
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











