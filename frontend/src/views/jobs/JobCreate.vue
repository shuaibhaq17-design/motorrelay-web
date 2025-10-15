<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  title: '',
  price: '',
  pickup_label: '',
  pickup_postcode: '',
  dropoff_label: '',
  dropoff_postcode: '',
  distance_mi: '',
  vehicle_make: '',
  vehicle_type: '',
  notes: ''
});

const submitting = ref(false);
const errorMessage = ref('');

async function submit() {
  if (!auth.token) {
    errorMessage.value = 'You need to log in as a dealer to create jobs.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  try {
    await api.post('/jobs', form);
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
  <div class="mx-auto max-w-3xl space-y-6 rounded-2xl border bg-white p-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Create a job</h1>
      <p class="text-sm text-slate-600">
        Publish a new MotorRelay run for drivers. This form posts to the Laravel API.
      </p>
    </header>

    <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submit">
      <div class="md:col-span-2">
        <label class="text-sm font-semibold text-slate-700">Title</label>
        <input
          v-model="form.title"
          type="text"
          required
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
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Distance (mi)</label>
        <input
          v-model="form.distance_mi"
          type="number"
          min="0"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Pickup address</label>
        <input
          v-model="form.pickup_label"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Pickup postcode</label>
        <input
          v-model="form.pickup_postcode"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Drop-off address</label>
        <input
          v-model="form.dropoff_label"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Drop-off postcode</label>
        <input
          v-model="form.dropoff_postcode"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Vehicle make</label>
        <input
          v-model="form.vehicle_make"
          type="text"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Vehicle type</label>
        <input
          v-model="form.vehicle_type"
          type="text"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div class="md:col-span-2">
        <label class="text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          v-model="form.notes"
          rows="4"
          placeholder="Any special instructions for this run"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        ></textarea>
      </div>

      <p v-if="errorMessage" class="md:col-span-2 text-sm text-red-600">{{ errorMessage }}</p>

      <div class="md:col-span-2 flex justify-end">
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
