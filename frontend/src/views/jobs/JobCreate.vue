<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  title: '',
  pickup_postcode: '',
  dropoff_postcode: '',
  vehicle_make: '',
  price: '',
  transport_type: 'drive_away'
});

const submitting = ref(false);
const errorMessage = ref('');

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

function selectTransport(value) {
  form.transport_type = value;
}

async function submit() {
  if (!auth.token) {
    errorMessage.value = 'You need to log in as a dealer to create jobs.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    await api.post('/jobs', {
      title: form.title,
      pickup_postcode: form.pickup_postcode,
      dropoff_postcode: form.dropoff_postcode,
      vehicle_make: form.vehicle_make,
      price: Number(form.price || 0),
      transport_type: form.transport_type
    });

    router.push({ name: 'jobs' });
  } catch (error) {
    console.error('Failed to create job', error);
    errorMessage.value = error.response?.data?.message || 'Could not create job. Please check the form.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (!auth.user && auth.token) {
    auth.fetchMe().catch(() => null);
  }
});
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-white p-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Create Job</h1>
      <p class="text-sm text-slate-600">
        Include pick-up, drop-off, vehicle details, price, and transport type.
      </p>
    </header>

    <form class="space-y-4" @submit.prevent="submit">
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
        <label class="text-sm font-semibold text-slate-700">Price (£)</label>
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

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end">
        <button
          type="submit"
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
        >
          <span v-if="submitting">Creating…</span>
          <span v-else>Create job</span>
        </button>
      </div>
    </form>
  </div>
</template>
