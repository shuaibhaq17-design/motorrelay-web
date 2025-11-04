<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  }
});

const router = useRouter();
const auth = useAuthStore();

const defaultFormState = {
  title: '',
  pickup_postcode: '',
  dropoff_postcode: '',
  vehicle_make: '',
  price: '',
  transport_type: 'drive_away',
  pickup_date: '',
  pickup_time: '',
  delivery_date: '',
  delivery_time: '',
  is_urgent: false,
  urgent_fee_ack: false
};

const form = reactive({ ...defaultFormState });

const submitting = ref(false);
const errorMessage = ref('');
const loading = ref(false);
const loadError = ref('');

const transportOptions = [
  {
    value: 'drive_away',
    label: 'Drive-away',
    helper: 'Driver delivers by driving the vehicle to the destination.'
  },
  {
    value: 'trailer',
    label: 'Trailer',
    helper: 'Vehicle transported on a trailer or transporter.'
  }
];

const selectedTransport = computed(() => {
  return transportOptions.find((option) => option.value === form.transport_type) ?? transportOptions[0];
});

const jobId = computed(() => {
  if (props.id === null || props.id === undefined || props.id === '') {
    return null;
  }
  return String(props.id);
});

const isEdit = computed(() => Boolean(jobId.value));

const paidPlans = ['gold_driver', 'dealer_pro'];
const planSlug = computed(() => (auth.planSlug || auth.user?.plan_slug || '').toLowerCase());
const hasPaidPlan = computed(() => paidPlans.includes(planSlug.value));
const requiresUrgentAcknowledgement = computed(() => form.is_urgent && !hasPaidPlan.value);
const urgentHelperText = computed(() => {
  if (!form.is_urgent) {
    return 'Enable urgent boost to highlight your job to available drivers.';
  }
  return hasPaidPlan.value
    ? 'Urgent boost is included with your subscription.'
    : 'Urgent boost adds an extra charge on Starter so we can prioritise your job.';
});

function selectTransport(value) {
  form.transport_type = value;
}

watch(
  () => form.is_urgent,
  (next) => {
    if (!next) {
      form.urgent_fee_ack = false;
    }
  }
);

const starterUsageInfo = computed(() => {
  if (planSlug.value !== 'starter') return null;

  const jobLimit = auth.planLimits?.monthly_job_posts ?? null;
  const jobUsed = auth.usage?.job_posts_this_month ?? 0;
  const urgentLimit = auth.planLimits?.urgent_boost_per_month ?? null;
  const urgentUsed = auth.usage?.urgent_boosts_used ?? 0;

  return {
    jobLimit,
    jobUsed,
    jobRemaining: jobLimit != null ? Math.max(jobLimit - jobUsed, 0) : null,
    urgentLimit,
    urgentUsed,
    urgentRemaining: urgentLimit != null ? Math.max(urgentLimit - urgentUsed, 0) : null
  };
});

const canUseUrgentBoost = computed(() => {
  if (!starterUsageInfo.value) return true;
  if (starterUsageInfo.value.urgentRemaining === null) return true;
  return starterUsageInfo.value.urgentRemaining > 0;
});

watch(canUseUrgentBoost, (allowed) => {
  if (!allowed) {
    form.is_urgent = false;
    form.urgent_fee_ack = false;
  }
});


function buildDateTime(dateValue, timeValue) {
  if (!dateValue) {
    return null;
  }
  const timePart = timeValue ? `${timeValue}` : '00:00';
  return `${dateValue} ${timePart}`;
}

function buildComparison(dateValue, timeValue) {
  if (!dateValue) {
    return null;
  }
  const safeTime = timeValue ? `${timeValue}:00` : '00:00:00';
  return new Date(`${dateValue}T${safeTime}`);
}

async function submit() {
  if (!auth.token) {
    errorMessage.value = 'You need to log in as a dealer to create jobs.';
    return;
  }
  if (isEdit.value && auth.role !== 'dealer') {
    errorMessage.value = 'Only dealers can edit jobs.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    if (requiresUrgentAcknowledgement.value && !form.urgent_fee_ack) {
      throw new Error('Please acknowledge the urgent boost fee before continuing.');
    }

    const pickupComparable = buildComparison(form.pickup_date, form.pickup_time);
    const deliveryComparable = buildComparison(form.delivery_date, form.delivery_time);

    if (pickupComparable && deliveryComparable && deliveryComparable < pickupComparable) {
      throw new Error('Delivery due time must be after the pickup ready time.');
    }

    const payload = {
      title: form.title,
      pickup_postcode: form.pickup_postcode,
      dropoff_postcode: form.dropoff_postcode,
      vehicle_make: form.vehicle_make,
      price: Number(form.price || 0),
      transport_type: form.transport_type,
      pickup_ready_at: buildDateTime(form.pickup_date, form.pickup_time),
      delivery_due_at: buildDateTime(form.delivery_date, form.delivery_time),
      is_urgent: form.is_urgent,
      urgent_accept_fee: requiresUrgentAcknowledgement.value ? form.urgent_fee_ack : false
    };

    if (isEdit.value) {
      await api.patch(`/jobs/${jobId.value}`, payload);
      await auth.fetchMe().catch(() => null);
      router.push({ name: 'job-detail', params: { id: jobId.value } });
    } else {
      await api.post('/jobs', payload);
      await auth.fetchMe().catch(() => null);
      router.push({ name: 'jobs' });
    }
  } catch (error) {
    console.error('Failed to create job', error);
    errorMessage.value =
      error.response?.data?.message ||
      error.message ||
      'Could not save job. Please check the form.';
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  Object.assign(form, { ...defaultFormState });
}

function splitDateTime(value) {
  if (!value) {
    return { date: '', time: '' };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  const pad = (num) => String(num).padStart(2, '0');
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return { date: datePart, time: timePart };
}

async function loadJobForEditing() {
  if (!isEdit.value) {
    resetForm();
    return;
  }

  loading.value = true;
  loadError.value = '';

  try {
    const { data } = await api.get(`/jobs/${jobId.value}`);
    const job = data?.data ?? data ?? null;
    if (!job) {
      throw new Error('Job not found.');
    }

    const pickup = splitDateTime(job.pickup_ready_at);
    const dropoff = splitDateTime(job.delivery_due_at);

    Object.assign(form, {
      title: job.title || '',
      pickup_postcode: job.pickup_postcode || '',
      dropoff_postcode: job.dropoff_postcode || '',
      vehicle_make: job.vehicle_make || '',
      price: job.price != null ? String(job.price) : '',
      transport_type: job.transport_type || 'drive_away',
      pickup_date: pickup.date,
      pickup_time: pickup.time,
      delivery_date: dropoff.date,
      delivery_time: dropoff.time,
      is_urgent: Boolean(job.is_urgent),
      urgent_fee_ack: Boolean(job.is_urgent)
    });
  } catch (error) {
    console.error('Failed to load job for editing', error);
    loadError.value =
      error.response?.data?.message ||
      error.message ||
      'We could not load this job for editing.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!auth.user && auth.token) {
    auth.fetchMe().catch(() => null);
  }
  if (isEdit.value) {
    loadJobForEditing();
  }
});

watch(
  () => jobId.value,
  (next, prev) => {
    if (next !== prev) {
      if (next) {
        loadJobForEditing();
      } else {
        resetForm();
      }
    }
  }
);
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-white p-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">
        {{ isEdit ? 'Edit Job' : 'Create Job' }}
      </h1>
      <p class="text-sm text-slate-600">
        {{ isEdit ? 'Update pickup, drop-off, vehicle details, price, and transport type.' : 'Include pick-up, drop-off, vehicle details, price, and transport type.' }}
      </p>
    </header>

    <div v-if="loading" class="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
      Loading job details...
    </div>

    <p v-else-if="loadError" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      {{ loadError }}
    </p>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <div v-if="starterUsageInfo" class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800">
        <p class="font-semibold text-emerald-900">Starter plan usage</p>
        <p class="mt-1">Job posts this month: {{ starterUsageInfo.jobUsed }}<span v-if="starterUsageInfo.jobLimit"> / {{ starterUsageInfo.jobLimit }}</span></p>
        <p>Urgent boosts used: {{ starterUsageInfo.urgentUsed }}<span v-if="starterUsageInfo.urgentLimit"> / {{ starterUsageInfo.urgentLimit }}</span></p>
        <p v-if="starterUsageInfo.jobRemaining !== null" class="text-xs text-emerald-700">{{ starterUsageInfo.jobRemaining }} job(s) remaining this month.</p>
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          required
          placeholder="e.g. Deliver Audi A3 to Manchester"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Pickup postcode</label>
        <input
          v-model="form.pickup_postcode"
          type="text"
          required
          placeholder="e.g. M1 2AB"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Drop-off postcode</label>
        <input
          v-model="form.dropoff_postcode"
          type="text"
          required
          placeholder="e.g. LS1 4XY"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Vehicle make/model</label>
        <input
          v-model="form.vehicle_make"
          type="text"
          placeholder="e.g. BMW 3 Series"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Price (GBP)</label>
        <input
          v-model="form.price"
          type="number"
          min="0"
          required
          placeholder="e.g. 120"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Transport type</label>
        <div class="mt-2 flex gap-2">
          <button
            v-for="option in transportOptions"
            :key="option.value"
            type="button"
            :class="[
              'rounded-xl border px-3 py-2 text-sm font-semibold transition',
              form.transport_type === option.value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
            ]"
            @click="selectTransport(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          {{ selectedTransport.helper }}
        </p>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <header class="mb-3">
          <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Timing preferences</h2>
          <p class="text-xs text-slate-500">
            Let drivers know when the vehicle is ready for collection and when you need it delivered.
          </p>
        </header>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-xs font-semibold uppercase text-slate-500">Pickup ready date</label>
            <input
              v-model="form.pickup_date"
              type="date"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              v-model="form.pickup_time"
              type="time"
              class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label class="text-xs font-semibold uppercase text-slate-500">Delivery due by</label>
            <input
              v-model="form.delivery_date"
              type="date"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              v-model="form.delivery_time"
              type="time"
              class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <label class="flex items-start gap-3">
          <input
            v-model="form.is_urgent" :disabled="!canUseUrgentBoost"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span class="text-sm font-semibold text-emerald-800">Add urgent job boost</span>
            <p class="text-xs text-emerald-700">{{ urgentHelperText }}</p>
          </span>
        </label>

        <div
          v-if="requiresUrgentAcknowledgement"
          class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
        >
          <p>The urgent boost adds an extra charge for Starter plans.</p>
          <label class="mt-2 flex items-start gap-2">
            <input
              v-model="form.urgent_fee_ack"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
            />
            <span>I understand an extra urgent fee will be added to this job.</span>
          </label>
        </div>
        <p v-if="starterUsageInfo && starterUsageInfo.urgentRemaining === 0" class="mt-3 text-xs text-amber-700">
          Starter urgent boost quota reached for this month.
        </p>
      </section>

      <p class="text-xs text-slate-500">
        New jobs stay private for the first three minutes so you can make quick corrections before drivers see them.
      </p>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end">
        <button
          type="submit"
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting || (requiresUrgentAcknowledgement && !form.urgent_fee_ack)"
        >
          <span v-if="submitting">Creating...</span>
          <span v-else>Create job</span>
        </button>
      </div>
    </form>
  </div>
</template>
