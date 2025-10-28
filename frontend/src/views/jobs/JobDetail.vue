<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import {
  fetchJob,
  fetchJobApplications,
  updateJobApplication,
  fetchJobExpenses,
  createJobExpense,
  updateJobExpense,
  deleteJobExpense,
  reviewJobExpense,
  submitJobCompletion,
  approveJobCompletion,
  rejectJobCompletion,
  downloadExpenseReceipt,
  downloadDeliveryProof,
  updateJobLocation
} from "@/services/jobs";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const job = ref(null);
const loading = ref(false);
const errorMessage = ref("");

const applications = ref([]);
const applicationsLoading = ref(false);
const applicationsError = ref("");

const expenses = ref([]);
const expensesSummary = ref({
  submitted_total: 0,
  approved_total: 0,
  rejected_total: 0
});
const expensesLoading = ref(false);
const expensesError = ref("");
const expenseForm = reactive({
  description: "",
  amount: "",
  vat_rate: "20",
  receipt: null
});
const expenseFormKey = ref(0);
const expenseFormError = ref("");
const expenseSubmitting = ref(false);
const editingExpenseId = ref(null);
const receiptDownloadingId = ref(null);

const completionForm = reactive({
  notes: "",
  proof: null
});
const completionFormKey = ref(0);
const completionError = ref("");
const completionSubmitting = ref(false);
const completionDecisionLoading = ref(false);
const proofDownloading = ref(false);

const trackingState = reactive({
  sending: false,
  error: "",
  lastUpdate: null
});
const navigationModalOpen = ref(false);

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
});

function formatCurrency(value, currencyCode = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode || "GBP",
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  } catch {
    return `${currencyCode} ${Number(value || 0).toFixed(2)}`;
  }
}

function formatDateTime(value) {
  if (!value) return "--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function shareLiveLocation() {
  if (!job.value) return;
  trackingState.error = "";
  trackingState.sending = true;
  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 15000
    });

    const coords = position.coords || {};
    const payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined,
      heading: coords.heading ?? undefined,
      speed_kph: typeof coords.speed === "number" && !Number.isNaN(coords.speed) ? Math.max(coords.speed * 3.6, 0) : undefined,
      source: "web"
    };

    if (payload.latitude === undefined || payload.longitude === undefined) {
      throw new Error("Unable to determine your current position.");
    }

    const response = await updateJobLocation(job.value.id, payload);
    if (response?.job) {
      job.value = {
        ...job.value,
        current_latitude: response.job.current_latitude,
        current_longitude: response.job.current_longitude,
        last_tracked_at: response.job.last_tracked_at
      };
      trackingState.lastUpdate = response.job.last_tracked_at;
    }
    navigationModalOpen.value = true;
  } catch (error) {
    console.error("Failed to share live location", error);
    trackingState.error =
      error?.message ||
      error?.response?.data?.message ||
      "We could not determine your current location. Please try again.";
  } finally {
    trackingState.sending = false;
  }
}

function closeNavigationModal() {
  navigationModalOpen.value = false;
}

function resetExpenseForm() {
  expenseForm.description = "";
  expenseForm.amount = "";
  expenseForm.vat_rate = "20";
  expenseForm.receipt = null;
  expenseFormError.value = "";
  editingExpenseId.value = null;
  expenseFormKey.value += 1;
}

function resetCompletionForm() {
  completionForm.notes = "";
  completionForm.proof = null;
  completionError.value = "";
  completionFormKey.value += 1;
}

function updateExpenseSummary(list) {
  const totals = {
    submitted_total: 0,
    approved_total: 0,
    rejected_total: 0
  };

  list.forEach((expense) => {
    const totalAmount = Number(expense?.total_amount ?? 0);
    if (expense.status === "submitted") {
      totals.submitted_total += totalAmount;
    } else if (expense.status === "approved") {
      totals.approved_total += totalAmount;
    } else if (expense.status === "rejected") {
      totals.rejected_total += totalAmount;
    }
  });

  expensesSummary.value = totals;
}

function syncExpensesFromJob() {
  if (!job.value) {
    expenses.value = [];
    updateExpenseSummary([]);
    return;
  }

  if (Array.isArray(job.value.expenses)) {
    expenses.value = job.value.expenses;
  } else {
    expenses.value = [];
  }

  if (job.value.expenses_summary) {
    expensesSummary.value = {
      submitted_total: Number(job.value.expenses_summary.submitted_total ?? 0),
      approved_total: Number(job.value.expenses_summary.approved_total ?? 0),
      rejected_total: Number(job.value.expenses_summary.rejected_total ?? 0)
    };
  } else {
    updateExpenseSummary(expenses.value);
  }
}

async function refreshExpenses() {
  if (!job.value || !canSeeExpenses.value) {
    expenses.value = [];
    updateExpenseSummary([]);
    return;
  }

  expensesLoading.value = true;
  expensesError.value = "";
  try {
    const payload = await fetchJobExpenses(job.value.id);
    const list = Array.isArray(payload?.data) ? payload.data : [];
    expenses.value = list;
    updateExpenseSummary(list);
  } catch (error) {
    console.error("Failed to load expenses", error);
    expensesError.value = "Unable to load expenses right now.";
    expenses.value = [];
    updateExpenseSummary([]);
  } finally {
    expensesLoading.value = false;
  }
}

const assignedDriver = computed(() => job.value?.assigned_to ?? null);
const currentRole = computed(() => auth.role ?? auth.user?.role ?? null);

const goLiveDate = computed(() => {
  if (!job.value?.goes_live_at) return null;
  const parsed = new Date(job.value.goes_live_at);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
});

const isAwaitingGoLive = computed(() => {
  if (!goLiveDate.value) return false;
  return goLiveDate.value.getTime() > Date.now();
});

const goLiveFormatted = computed(() => {
  if (!goLiveDate.value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(goLiveDate.value);
});


const basicAnalytics = computed(() => job.value?.basic_analytics ?? null);

const lastTrackedAt = computed(() => trackingState.lastUpdate ?? job.value?.last_tracked_at ?? null);

const lastTrackedDisplay = computed(() => (lastTrackedAt.value ? formatDateTime(lastTrackedAt.value) : ""));

const canShareTracking = computed(() => {
  if (!job.value || !auth.user) return false;
  const activeStatuses = new Set(["in_progress", "collected", "in_transit", "accepted"]);
  return job.value.assigned_to_id === auth.user.id && activeStatuses.has(String(job.value.status || "").toLowerCase());
});

const navigationDestination = computed(() => {
  if (!job.value) return "";
  const parts = [job.value.dropoff_label, job.value.dropoff_postcode].filter(Boolean);
  return parts.join(", ");
});

const navigationLinks = computed(() => {
  const destination = navigationDestination.value;
  if (!destination) return [];
  const encoded = encodeURIComponent(destination);
  return [
    {
      id: "google",
      label: "Open in Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`
    },
    {
      id: "waze",
      label: "Open in Waze",
      href: `https://waze.com/ul?q=${encoded}&navigate=yes`
    }
  ];
});

const statusDescription = computed(() => {
  if (!job.value) return "";
  const status = String(job.value.status || "").toLowerCase();

  if (status === "open") {
    return "This job is open and awaiting driver applications.";
  }

  if (["pending", "accepted", "in_progress", "collected", "in_transit"].includes(status)) {
    if (assignedDriver.value) {
      return `This job is currently in progress with ${assignedDriver.value.name}.`;
    }
    return "This job is being prepared and will be assigned shortly.";
  }

  if (status === "completion_pending") {
    return "Completion has been submitted and is awaiting dealer approval.";
  }

  if (["delivered", "completed", "closed"].includes(status)) {
    if (assignedDriver.value) {
      return `This job was completed by ${assignedDriver.value.name}.`;
    }
    return "This job has been completed.";
  }

  if (status === "cancelled") {
    return "This job has been cancelled.";
  }

  return `This job status is ${job.value.status}.`;
});

const canReviewApplications = computed(() => {
  if (!job.value || !auth.user) return false;
  if (currentRole.value === "admin") return true;
  return job.value.posted_by_id === auth.user.id;
});

const isDealerForJob = computed(() => {
  if (!job.value || !auth.user) return false;
  return job.value.posted_by_id === auth.user.id;
});

const isAssignedDriver = computed(() => {
  if (!job.value || !auth.user) return false;
  return job.value.assigned_to_id === auth.user.id;
});

const canSeeExpenses = computed(() => {
  if (!job.value || !auth.token) return false;
  if (currentRole.value === "admin") return true;
  return isDealerForJob.value || isAssignedDriver.value;
});

const canSubmitExpenses = computed(() => {
  if (!canSeeExpenses.value) return false;
  if (!isAssignedDriver.value) return false;
  return !job.value?.finalized_invoice_id;
});

const canReviewExpenses = computed(() => {
  if (!canSeeExpenses.value) return false;
  return currentRole.value === "admin" || isDealerForJob.value;
});

const shouldShowGoLiveBanner = computed(
  () => isDealerForJob.value && isAwaitingGoLive.value
);
const completionStatus = computed(() => job.value?.completion_status ?? "not_submitted");

const canSubmitCompletion = computed(() => {
  if (!isAssignedDriver.value) return false;
  return !job.value?.finalized_invoice_id;
});

const canApproveCompletion = computed(() => {
  if (!(currentRole.value === "admin" || isDealerForJob.value)) return false;
  return completionStatus.value === "submitted";
});

const hasDeliveryProof = computed(() => Boolean(job.value?.delivery_proof_path));

const invoiceFinalized = computed(() => Boolean(job.value?.finalized_invoice_id));

const myApplication = computed(() => job.value?.my_application ?? null);

const transportLabel = computed(() => {
  const raw = (job.value?.transport_type || '').toString().toLowerCase();
  if (raw === 'drive_away') {
    return 'Drive-away';
  }
  if (raw === 'trailer') {
    return 'Trailer';
  }
  return job.value?.transport_type || '--';
});

async function loadJob() {
  const jobId = route.params.id;
  if (!jobId) {
    job.value = null;
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  try {
    const payload = await fetchJob(jobId);
    job.value = payload?.data ?? payload ?? null;
    syncExpensesFromJob();
    trackingState.lastUpdate = job.value?.last_tracked_at ?? null;
  } catch (error) {
    console.error("Failed to load job", error);
    errorMessage.value = "We could not load this job.";
    job.value = null;
    expenses.value = [];
    updateExpenseSummary([]);
    trackingState.lastUpdate = null;
  } finally {
    loading.value = false;
  }

  if (!job.value) {
    applications.value = [];
    return;
  }

  await loadApplicationsIfNeeded();

  if (canSeeExpenses.value) {
    await refreshExpenses();
  } else {
    expenses.value = [];
    updateExpenseSummary([]);
  }
}

async function loadApplicationsIfNeeded() {
  if (!job.value || !canReviewApplications.value) {
    applications.value = [];
    return;
  }

  applicationsLoading.value = true;
  applicationsError.value = "";
  try {
    const payload = await fetchJobApplications(job.value.id);
    applications.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error("Failed to load applications", error);
    applicationsError.value = "Unable to load applications right now.";
    applications.value = [];
  } finally {
    applicationsLoading.value = false;
  }
}

async function handleApplicationDecision(applicationId, status) {
  if (!job.value) return;
  try {
    await updateJobApplication(job.value.id, applicationId, { status });
    await loadJob();
    await loadApplicationsIfNeeded();
  } catch (error) {
    console.error("Failed to update application", error);
    alert(error.response?.data?.message || "Unable to update application. Please try again.");
  }
}

function onExpenseReceiptChange(event) {
  const [file] = event.target?.files ?? [];
  expenseForm.receipt = file ?? null;
}

function startEditingExpense(expense) {
  editingExpenseId.value = expense.id;
  expenseForm.description = expense.description ?? "";
  expenseForm.amount = expense.amount ?? "";
  expenseForm.vat_rate = expense.vat_rate ?? "20";
  expenseForm.receipt = null;
  expenseFormError.value = "";
  expenseFormKey.value += 1;
}

function cancelExpenseEdit() {
  resetExpenseForm();
}

async function handleExpenseSubmit() {
  if (!job.value) return;
  if (!expenseForm.description?.trim() || expenseForm.amount === "") {
    expenseFormError.value = "Description and amount are required.";
    return;
  }

  expenseSubmitting.value = true;
  expenseFormError.value = "";
  try {
    const payload = {
      description: expenseForm.description,
      amount: expenseForm.amount,
      vat_rate: expenseForm.vat_rate,
      receipt: expenseForm.receipt ?? undefined
    };

    if (editingExpenseId.value) {
      await updateJobExpense(job.value.id, editingExpenseId.value, payload);
    } else {
      await createJobExpense(job.value.id, payload);
    }

    resetExpenseForm();
    await refreshExpenses();
    await loadJob();
  } catch (error) {
    console.error("Failed to save expense", error);
    expenseFormError.value = error.response?.data?.message || "Unable to save expense.";
  } finally {
    expenseSubmitting.value = false;
  }
}

async function handleDeleteExpense(expense) {
  if (!job.value || !expense?.id) return;
  if (!window.confirm("Delete this expense?")) {
    return;
  }

  try {
    await deleteJobExpense(job.value.id, expense.id);
    await refreshExpenses();
    await loadJob();
  } catch (error) {
    console.error("Failed to delete expense", error);
    alert(error.response?.data?.message || "Unable to delete this expense.");
  }
}

async function handleReviewExpense(expense, decision) {
  if (!job.value || !expense?.id) return;
  const note = window.prompt("Add a note for the driver (optional)", "");
  if (note === null) {
    return;
  }

  try {
    await reviewJobExpense(job.value.id, expense.id, { decision, note });
    await refreshExpenses();
    await loadJob();
  } catch (error) {
    console.error("Failed to review expense", error);
    alert(error.response?.data?.message || "Unable to update this expense.");
  }
}

async function handleDownloadReceipt(expense) {
  if (!job.value || !expense?.id) return;

  receiptDownloadingId.value = expense.id;
  try {
    const response = await downloadExpenseReceipt(job.value.id, expense.id);
    const contentType = response.headers?.["content-type"] || "application/octet-stream";
    const extension = contentType.includes("pdf")
      ? "pdf"
      : contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : "bin";
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const safeName = (expense.description || "receipt").toString().replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName || "receipt"}-${expense.id}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download receipt", error);
    alert("We could not download the receipt.");
  } finally {
    receiptDownloadingId.value = null;
  }
}

function onCompletionProofChange(event) {
  const [file] = event.target?.files ?? [];
  completionForm.proof = file ?? null;
}

async function handleCompletionSubmit() {
  if (!job.value) return;
  if (!completionForm.proof) {
    completionError.value = "Please upload delivery proof before submitting.";
    return;
  }

  completionSubmitting.value = true;
  completionError.value = "";
  try {
    await submitJobCompletion(job.value.id, {
      notes: completionForm.notes,
      proof: completionForm.proof
    });
    resetCompletionForm();
    await loadJob();
  } catch (error) {
    console.error("Failed to submit completion", error);
    completionError.value = error.response?.data?.message || "Unable to submit completion.";
  } finally {
    completionSubmitting.value = false;
  }
}

async function handleApproveCompletion() {
  if (!job.value) return;
  completionDecisionLoading.value = true;
  try {
    await approveJobCompletion(job.value.id);
    await loadJob();
  } catch (error) {
    console.error("Failed to approve completion", error);
    alert(error.response?.data?.message || "Unable to approve completion.");
  } finally {
    completionDecisionLoading.value = false;
  }
}

async function handleRejectCompletion() {
  if (!job.value) return;
  const reason = window.prompt("Add a note for the driver (optional)", "");
  if (reason === null) {
    return;
  }

  completionDecisionLoading.value = true;
  try {
    await rejectJobCompletion(job.value.id, { reason });
    await loadJob();
  } catch (error) {
    console.error("Failed to reject completion", error);
    alert(error.response?.data?.message || "Unable to reject completion.");
  } finally {
    completionDecisionLoading.value = false;
  }
}

async function handleDownloadProof() {
  if (!job.value) return;

  proofDownloading.value = true;
  try {
    const response = await downloadDeliveryProof(job.value.id);
    const contentType = response.headers?.["content-type"] || "application/octet-stream";
    const extension = contentType.includes("pdf")
      ? "pdf"
      : contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : "bin";
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-${job.value.id}-proof.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download delivery proof", error);
    alert("We could not download the delivery proof.");
  } finally {
    proofDownloading.value = false;
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
    resetExpenseForm();
    resetCompletionForm();
    loadJob();
  }
);

watch(
  () => job.value?.last_tracked_at,
  (value) => {
    if (value) {
      trackingState.lastUpdate = value;
    }
  }
);
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

      <section
        v-if="shouldShowGoLiveBanner"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      >
        <div class="font-semibold text-amber-900">Scheduled to go live soon</div>
        <p class="mt-1">
          This job will become visible to drivers at
          <strong>{{ goLiveFormatted }}</strong>. You can make changes from the Jobs page until then.
        </p>
      </section>

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
              <span class="text-sm font-semibold text-slate-500">Transport type</span>
              <span class="text-base font-semibold text-slate-900">{{ transportLabel }}</span>
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

      <section v-if="canShareTracking" class="tile space-y-3 p-4">
        <header class="space-y-1">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Live tracking</h2>
          <p class="text-xs text-slate-500">
            Share your current position with the dealer and launch navigation for the drop-off.
          </p>
        </header>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            :disabled="trackingState.sending"
            @click="shareLiveLocation"
          >
            <span v-if="trackingState.sending">Sharing location…</span>
            <span v-else>Share live location</span>
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="navigationModalOpen = true"
          >
            Open navigation apps
          </button>
        </div>
        <p v-if="trackingState.error" class="text-xs text-rose-600">
          {{ trackingState.error }}
        </p>
        <p v-if="lastTrackedDisplay" class="text-xs text-slate-500">
          Last shared: {{ lastTrackedDisplay }}
        </p>
      </section>

      <section v-if="basicAnalytics" class="tile space-y-4 p-4">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Basic analytics</h2>
            <p class="text-xs text-slate-500">Snapshot of views generated while this job is live.</p>
          </div>
          <span class="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {{ basicAnalytics.views_last_7_days }} this week
          </span>
        </header>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Views today</p>
            <p class="text-2xl font-bold text-slate-900">{{ basicAnalytics.views_today }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Last 7 days</p>
            <p class="text-2xl font-bold text-slate-900">{{ basicAnalytics.views_last_7_days }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily log</p>
            <ul class="mt-1 space-y-1 text-xs text-slate-500">
              <li v-for="day in basicAnalytics.daily" :key="day.date">
                {{ new Date(day.date).toLocaleDateString() }} - {{ day.views }} views
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section v-if="canSeeExpenses" class="tile space-y-4 p-4">
        <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Expenses</h2>
            <p class="text-xs text-slate-500">
              Track expense submissions and approvals for this job.
            </p>
          </div>
          <div class="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>
              Submitted:
              <span class="font-semibold text-slate-800">{{ formatCurrency(expensesSummary.submitted_total) }}</span>
            </span>
            <span>
              Approved:
              <span class="font-semibold text-emerald-700">{{ formatCurrency(expensesSummary.approved_total) }}</span>
            </span>
            <span>
              Rejected:
              <span class="font-semibold text-slate-800">{{ formatCurrency(expensesSummary.rejected_total) }}</span>
            </span>
          </div>
        </header>

        <p v-if="expensesError" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {{ expensesError }}
        </p>

        <form
          v-if="canSubmitExpenses"
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
          @submit.prevent="handleExpenseSubmit"
        >
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
            <input
              v-model="expenseForm.description"
              type="text"
              required
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Taxi from auction"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</label>
            <input
              v-model="expenseForm.amount"
              type="number"
              min="0"
              step="0.01"
              required
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="32.00"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">VAT %</label>
            <input
              v-model="expenseForm.vat_rate"
              type="number"
              min="0"
              step="0.5"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt</label>
            <input
              :key="expenseFormKey"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              class="mt-1 w-full text-sm text-slate-600"
              @change="onExpenseReceiptChange"
            />
            <p class="mt-1 text-xs text-slate-500">Images or PDF up to 5 MB.</p>
          </div>
          <div class="md:col-span-2 flex items-end justify-end gap-2">
            <button
              v-if="editingExpenseId"
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              @click="cancelExpenseEdit"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              :disabled="expenseSubmitting"
            >
              <span v-if="expenseSubmitting">{{ editingExpenseId ? 'Updating...' : 'Saving...' }}</span>
              <span v-else>{{ editingExpenseId ? 'Update expense' : 'Add expense' }}</span>
            </button>
          </div>
          <p v-if="expenseFormError" class="md:col-span-4 text-xs text-amber-700">{{ expenseFormError }}</p>
        </form>

        <div v-if="expensesLoading" class="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          Loading expenses...
        </div>

        <div
          v-else-if="!expenses.length"
          class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
        >
          No expenses submitted yet.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="expense in expenses"
            :key="expense.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ expense.description }}
                </p>
                <p class="text-xs text-slate-500">
                  Submitted {{ formatDateTime(expense.submitted_at) }}
                  <span v-if="expense.driver?.name"> - {{ expense.driver.name }}</span>
                </p>
              </div>
              <span
                class="badge"
                :class="{
                  'bg-emerald-100 text-emerald-700': expense.status === 'approved',
                  'bg-amber-100 text-amber-700': expense.status === 'submitted',
                  'bg-rose-100 text-rose-700': expense.status === 'rejected'
                }"
              >
                {{ expense.status }}
              </span>
            </div>

            <dl class="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <div>
                <dt class="uppercase tracking-wide">Net</dt>
                <dd class="font-semibold text-slate-900">{{ formatCurrency(expense.amount) }}</dd>
              </div>
              <div>
                <dt class="uppercase tracking-wide">VAT ({{ expense.vat_rate }}%)</dt>
                <dd class="font-semibold text-slate-900">{{ formatCurrency(expense.vat_amount) }}</dd>
              </div>
              <div>
                <dt class="uppercase tracking-wide">Total</dt>
                <dd class="font-semibold text-slate-900">{{ formatCurrency(expense.total_amount) }}</dd>
              </div>
            </dl>

            <p v-if="expense.review_note" class="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Dealer note: {{ expense.review_note }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-if="expense.receipt_path"
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                :disabled="receiptDownloadingId === expense.id"
                @click="handleDownloadReceipt(expense)"
              >
                <span v-if="receiptDownloadingId === expense.id">Downloading...</span>
                <span v-else>Receipt</span>
              </button>

              <button
                v-if="isAssignedDriver && expense.is_editable"
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                @click="startEditingExpense(expense)"
              >
                Edit
              </button>
              <button
                v-if="isAssignedDriver && expense.is_editable"
                type="button"
                class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                @click="handleDeleteExpense(expense)"
              >
                Delete
              </button>

              <button
                v-if="canReviewExpenses && expense.status === 'submitted'"
                type="button"
                class="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                @click="handleReviewExpense(expense, 'approved')"
              >
                Approve
              </button>
              <button
                v-if="canReviewExpenses && expense.status === 'submitted'"
                type="button"
                class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                @click="handleReviewExpense(expense, 'rejected')"
              >
                Reject
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        v-if="canSubmitCompletion || canApproveCompletion || completionStatus !== 'not_submitted' || hasDeliveryProof || invoiceFinalized"
        class="tile space-y-4 p-4"
      >
        <header class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Job completion</h2>
            <p class="text-xs text-slate-500">
              Drivers submit delivery proof and dealers approve to trigger invoices.
            </p>
          </div>
          <span class="badge bg-slate-100 text-slate-800 uppercase">{{ completionStatus }}</span>
        </header>

        <div class="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <span class="font-semibold text-slate-500 uppercase tracking-wide">Submitted</span>
            <p class="text-sm font-semibold text-slate-900">
              {{ formatDateTime(job?.completion_submitted_at) }}
            </p>
          </div>
          <div>
            <span class="font-semibold text-slate-500 uppercase tracking-wide">Approved</span>
            <p class="text-sm font-semibold text-slate-900">
              {{ formatDateTime(job?.completion_approved_at) }}
            </p>
          </div>
          <div>
            <span class="font-semibold text-slate-500 uppercase tracking-wide">Rejected</span>
            <p class="text-sm font-semibold text-slate-900">
              {{ formatDateTime(job?.completion_rejected_at) }}
            </p>
          </div>
          <div>
            <span class="font-semibold text-slate-500 uppercase tracking-wide">Notes</span>
            <p class="text-sm text-slate-900">
              {{ job?.completion_notes || '--' }}
            </p>
          </div>
        </div>

        <p v-if="completionError" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {{ completionError }}
        </p>

        <form
          v-if="canSubmitCompletion"
          class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
          @submit.prevent="handleCompletionSubmit"
        >
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for dealer</label>
            <textarea
              v-model="completionForm.notes"
              rows="2"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Delivered at 17:45, keys left with reception"
            ></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery proof</label>
            <input
              :key="completionFormKey"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              class="mt-1 w-full text-sm text-slate-600"
              required
              @change="onCompletionProofChange"
            />
            <p class="mt-1 text-xs text-slate-500">Upload POD images or a signed PDF up to 8 MB.</p>
          </div>
          <div class="md:col-span-2 flex justify-end">
            <button
              type="submit"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              :disabled="completionSubmitting"
            >
              <span v-if="completionSubmitting">Submitting...</span>
              <span v-else>Submit completion</span>
            </button>
          </div>
        </form>

        <div
          v-if="hasDeliveryProof"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
        >
          <div>
            <span class="font-semibold text-slate-500 uppercase tracking-wide">Delivery proof</span>
            <p class="text-sm text-slate-900">
              Uploaded {{ formatDateTime(job?.completion_submitted_at) }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            :disabled="proofDownloading"
            @click="handleDownloadProof"
          >
            <span v-if="proofDownloading">Downloading...</span>
            <span v-else>Download proof</span>
          </button>
        </div>

        <div v-if="canApproveCompletion" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="completionDecisionLoading"
            @click="handleApproveCompletion"
          >
            <span v-if="completionDecisionLoading">Processing...</span>
            <span v-else>Approve completion</span>
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            :disabled="completionDecisionLoading"
            @click="handleRejectCompletion"
          >
            Request changes
          </button>
        </div>

        <div
          v-if="invoiceFinalized"
          class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700"
        >
          Invoice finalised.
          <RouterLink to="/invoices" class="font-semibold text-emerald-800 underline">View invoices</RouterLink>
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

    <transition name="fade">
      <div
        v-if="navigationModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
        @click.self="closeNavigationModal"
      >
        <div class="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <header class="space-y-1">
            <h3 class="text-lg font-semibold text-slate-900">Navigation</h3>
            <p class="text-sm text-slate-600">
              Choose an app to start directions to {{ navigationDestination || 'the drop-off location' }}.
            </p>
          </header>
          <div class="space-y-2">
            <a
              v-for="link in navigationLinks"
              :key="link.id"
              :href="link.href"
              target="_blank"
              rel="noopener"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              @click="closeNavigationModal"
            >
              {{ link.label }}
              <span aria-hidden="true">↗</span>
            </a>
            <p v-if="!navigationLinks.length" class="text-xs text-slate-500">
              We could not determine a destination for this job yet.
            </p>
          </div>
          <button
            type="button"
            class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="closeNavigationModal"
          >
            Close
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
