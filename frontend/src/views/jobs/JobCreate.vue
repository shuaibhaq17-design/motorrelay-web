<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { createJobCheckout } from '@/services/payments';
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
    helper: 'The driver will drive the vehicle from pickup to drop-off.'
  },
  {
    value: 'trailer',
    label: 'Trailer',
    helper: 'The vehicle should be moved on a trailer or transporter.'
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
const jobPrice = computed(() => Number(form.price || 0));
const platformCommissionRate = 0.1;
const estimatedPlatformFee = computed(() => Math.max(jobPrice.value * platformCommissionRate, 0));
const estimatedUrgentFee = computed(() => (requiresUrgentAcknowledgement.value ? 25 : 0));
const estimatedDealerTotal = computed(() => jobPrice.value + estimatedUrgentFee.value);
const estimatedDriverPayout = computed(() => Math.max(jobPrice.value - estimatedPlatformFee.value, 0));
const moneyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2
});
const urgentHelperText = computed(() => {
  if (!form.is_urgent) {
    return 'Optional. Use this when the job needs driver attention quickly.';
  }
  return hasPaidPlan.value
    ? 'Urgent boost is included with your subscription.'
    : 'Urgent boost adds an extra charge on Starter before the job is posted.';
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

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
      const { data: createdJob } = await api.post('/jobs', payload);
      await auth.fetchMe().catch(() => null);
      const checkout = await createJobCheckout(createdJob.id);
      if (!checkout?.url) {
        throw new Error('Job was created, but Stripe did not return a checkout link.');
      }
      window.location.href = checkout.url;
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
  <div class="mx-auto max-w-6xl space-y-5">
    <header class="section-card overflow-hidden bg-gradient-to-br from-white via-emerald-50/70 to-sky-50">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            {{ isEdit ? 'Update run' : 'Dealer job' }}
          </p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {{ isEdit ? 'Edit job' : 'Create a new job' }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add the vehicle, route, driver payout, and timing. New jobs go to Stripe checkout before drivers can start.
          </p>
        </div>
        <div class="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-xl">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Driver payout</p>
          <p class="mt-1 text-3xl font-black">{{ formatMoney(estimatedDriverPayout) }}</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="section-card text-sm text-slate-600">
      Loading job details...
    </div>

    <p v-else-if="loadError" class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
      {{ loadError }}
    </p>

    <form v-else class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" @submit.prevent="submit">
      <div class="space-y-5">
        <section v-if="starterUsageInfo" class="section-card border-emerald-200 bg-emerald-50/70 text-sm text-emerald-800">
          <p class="font-black text-emerald-900">Starter plan usage</p>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Job posts</p>
              <p class="mt-1 font-black text-slate-950">
                {{ starterUsageInfo.jobUsed }}<span v-if="starterUsageInfo.jobLimit"> / {{ starterUsageInfo.jobLimit }}</span>
              </p>
            </div>
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Urgent boosts</p>
              <p class="mt-1 font-black text-slate-950">
                {{ starterUsageInfo.urgentUsed }}<span v-if="starterUsageInfo.urgentLimit"> / {{ starterUsageInfo.urgentLimit }}</span>
              </p>
            </div>
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Remaining</p>
              <p class="mt-1 font-black text-slate-950">
                {{ starterUsageInfo.jobRemaining ?? 'Unlimited' }}
              </p>
            </div>
          </div>
        </section>

        <section class="section-card space-y-5">
          <header>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Vehicle</p>
            <h2 class="mt-1 text-xl font-black text-slate-950">What is being moved?</h2>
          </header>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block">
              <span class="text-sm font-bold text-slate-700">Licence plate</span>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="e.g. AB12 CDE"
                class="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </label>

            <label class="block">
              <span class="text-sm font-bold text-slate-700">Vehicle make/model</span>
              <input
                v-model="form.vehicle_make"
                type="text"
                placeholder="e.g. BMW 3 Series"
                class="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </label>
          </div>
        </section>

        <section class="section-card space-y-5">
          <header>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Route</p>
            <h2 class="mt-1 text-xl font-black text-slate-950">Pickup and drop-off</h2>
          </header>

          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] md:items-end">
            <label class="block">
              <span class="text-sm font-bold text-slate-700">Pickup postcode</span>
              <input
                v-model="form.pickup_postcode"
                type="text"
                required
                placeholder="e.g. M1 2AB"
                class="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </label>

            <div class="hidden pb-3 md:flex md:items-center md:justify-center">
              <div class="relative h-10 w-full">
                <div class="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-300 to-sky-300"></div>
                <div class="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
                <div class="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-sky-500 ring-4 ring-sky-100"></div>
                <div class="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-slate-950 text-lg shadow-xl">
                  🚙
                </div>
              </div>
            </div>

            <label class="block">
              <span class="text-sm font-bold text-slate-700">Drop-off postcode</span>
              <input
                v-model="form.dropoff_postcode"
                type="text"
                required
                placeholder="e.g. LS1 4XY"
                class="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </label>
          </div>
        </section>

        <section class="section-card space-y-5">
          <header>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Movement</p>
            <h2 class="mt-1 text-xl font-black text-slate-950">Transport and timing</h2>
          </header>

          <div>
            <p class="text-sm font-bold text-slate-700">Transport type</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                v-for="option in transportOptions"
                :key="option.value"
                type="button"
                :class="[
                  'rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg',
                  form.transport_type === option.value
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
                ]"
                @click="selectTransport(option.value)"
              >
                <span class="font-black">{{ option.label }}</span>
                <span class="mt-1 block text-xs leading-5 text-slate-500">{{ option.helper }}</span>
              </button>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-black uppercase tracking-wide text-slate-500">Pickup ready</p>
              <input
                v-model="form.pickup_date"
                type="date"
                class="mt-3 w-full rounded-2xl border px-4 py-3 text-sm"
              />
              <input
                v-model="form.pickup_time"
                type="time"
                class="mt-3 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </div>

            <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-black uppercase tracking-wide text-slate-500">Delivery due</p>
              <input
                v-model="form.delivery_date"
                type="date"
                class="mt-3 w-full rounded-2xl border px-4 py-3 text-sm"
              />
              <input
                v-model="form.delivery_time"
                type="time"
                class="mt-3 w-full rounded-2xl border px-4 py-3 text-sm"
              />
            </div>
          </div>
        </section>
      </div>

      <aside class="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <section class="section-card space-y-4">
          <header>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Payment</p>
            <h2 class="mt-1 text-xl font-black text-slate-950">Price breakdown</h2>
          </header>

          <label class="block">
            <span class="text-sm font-bold text-slate-700">Dealer charge (GBP)</span>
            <input
              v-model="form.price"
              type="number"
              min="0"
              required
              placeholder="e.g. 120"
              class="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
            />
          </label>

          <dl class="grid gap-3">
            <div class="rounded-2xl bg-slate-50 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Dealer charge</dt>
              <dd class="mt-1 text-xl font-black text-slate-950">{{ formatMoney(jobPrice) }}</dd>
            </div>
            <div class="rounded-2xl bg-emerald-50 p-4">
              <dt class="text-xs font-bold uppercase tracking-wide text-emerald-700">Platform fee</dt>
              <dd class="mt-1 text-xl font-black text-emerald-700">{{ formatMoney(estimatedPlatformFee) }}</dd>
            </div>
            <div class="rounded-2xl bg-slate-950 p-4 text-white">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-400">Driver receives</dt>
              <dd class="mt-1 text-2xl font-black">{{ formatMoney(estimatedDriverPayout) }}</dd>
            </div>
          </dl>

          <p class="text-xs leading-5 text-slate-500">
            The driver sees the payout after the platform fee, not the dealer charge.
          </p>
        </section>

        <section class="section-card border-emerald-200 bg-emerald-50/70">
          <label class="flex items-start gap-3">
            <input
              v-model="form.is_urgent"
              :disabled="!canUseUrgentBoost"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span class="text-sm font-black text-emerald-900">Add urgent boost</span>
              <p class="mt-1 text-xs leading-5 text-emerald-800">{{ urgentHelperText }}</p>
            </span>
          </label>

          <div
            v-if="requiresUrgentAcknowledgement"
            class="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
          >
            <p>This boost adds an extra charge for Starter plans.</p>
            <label class="mt-3 flex items-start gap-2">
              <input
                v-model="form.urgent_fee_ack"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
              />
              <span>I understand an extra boost fee will be added to this job.</span>
            </label>
          </div>
          <p v-if="starterUsageInfo && starterUsageInfo.urgentRemaining === 0" class="mt-3 text-xs text-amber-700">
            Starter urgent boost quota reached for this month.
          </p>
        </section>

        <p v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {{ errorMessage }}
        </p>

        <section class="section-card space-y-3">
          <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ready to post</p>
          <p class="text-sm text-slate-600">
            You can edit this job until a driver has been assigned.
          </p>
          <button
            type="submit"
            class="btn-primary w-full px-5 py-3"
            :disabled="submitting || (requiresUrgentAcknowledgement && !form.urgent_fee_ack)"
          >
            <span v-if="submitting">{{ isEdit ? 'Saving...' : 'Opening checkout...' }}</span>
            <span v-else>{{ isEdit ? 'Save changes' : 'Create and pay' }}</span>
          </button>
        </section>
      </aside>
    </form>
  </div>
</template>
