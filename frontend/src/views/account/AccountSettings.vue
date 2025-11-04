<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { submitAccountChangeRequest, fetchAccountChangeRequests } from '@/services/account';
import { useAuthStore } from '@/stores/auth';
import BackButton from '@/components/BackButton.vue';

const auth = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  address_line_one: '',
  address_line_two: '',
  city: '',
  postcode: '',
  company_number: '',
  passport_number: '',
  driver_dvla_code: '',
  notes: ''
});

const submitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const requests = ref([]);
const loadingRequests = ref(false);

const user = computed(() => auth.user || {});
const hydrated = ref(false);

function hydrateForm() {
  if (!user.value) return;
  form.name = user.value.name || '';
  form.email = user.value.email || '';
  form.phone = user.value.phone || '';
  form.company = user.value.company || '';
  form.address_line_one = user.value.address_line_one || '';
  form.address_line_two = user.value.address_line_two || '';
  form.city = user.value.city || '';
  form.postcode = user.value.postcode || '';
  form.company_number = user.value.company_number || '';
  form.passport_number = user.value.passport_number || '';
  form.driver_dvla_code = user.value.driver_dvla_code || '';
  if (!hydrated.value) {
    form.notes = '';
  }
  hydrated.value = true;
}

async function loadRequests() {
  loadingRequests.value = true;
  try {
    const payload = await fetchAccountChangeRequests();
    requests.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error('Failed to load account change requests', error);
  } finally {
    loadingRequests.value = false;
  }
}

function filenameFromPath(path) {
  if (!path) return '';
  const withoutQuery = String(path).split('?')[0];
  const segments = withoutQuery.split(/[\\/]/).filter(Boolean);
  if (!segments.length) {
    return withoutQuery;
  }
  return segments[segments.length - 1];
}

const dealerDocuments = computed(() => {
  if (!auth.user || auth.role !== 'dealer') {
    return [];
  }

  const docs = [
    {
      label: 'Trade policy document',
      path: auth.user.trade_policy_path,
      url: auth.user.trade_policy_url
    },
    {
      label: 'Trade plate photo',
      path: auth.user.trade_plate_photo_path,
      url: auth.user.trade_plate_photo_url
    },
    {
      label: 'Utility bill',
      path: auth.user.utility_bill_path,
      url: auth.user.utility_bill_url
    },
    {
      label: 'Passport selfie',
      path: auth.user.passport_selfie_path,
      url: auth.user.passport_selfie_url
    }
  ];

  return docs
    .filter((doc) => doc.path || doc.url)
    .map((doc) => ({
      ...doc,
      name: filenameFromPath(doc.path || doc.url || '')
    }));
});

const driverDocuments = computed(() => {
  if (!auth.user || auth.role !== 'driver') {
    return [];
  }

  const docs = [
    {
      label: 'Utility bill',
      path: auth.user.driver_utility_bill_path,
      url: auth.user.driver_utility_bill_url
    },
    {
      label: 'Driving licence (front)',
      path: auth.user.driver_license_front_path,
      url: auth.user.driver_license_front_url
    },
    {
      label: 'Driving licence (back)',
      path: auth.user.driver_license_back_path,
      url: auth.user.driver_license_back_url
    },
    {
      label: 'Passport photo',
      path: auth.user.driver_passport_path,
      url: auth.user.driver_passport_url
    },
    {
      label: 'Verification selfie',
      path: auth.user.driver_selfie_path,
      url: auth.user.driver_selfie_url
    }
  ];

  return docs
    .filter((doc) => doc.path || doc.url)
    .map((doc) => ({
      ...doc,
      name: filenameFromPath(doc.path || doc.url || '')
    }));
});

async function handleSubmit() {
  submitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await submitAccountChangeRequest({ ...form });
    successMessage.value = 'Thanks! Your update was sent to the MotorRelay admin team.';
    form.notes = '';
    await loadRequests();
  } catch (error) {
    console.error('Failed to send update request', error);
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.errors?.request?.[0] ||
      'We could not send your update. Please review your changes and try again.';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadRequests();
});

watch(
  () => auth.user,
  (next, previous) => {
    if (next && (!previous || !hydrated.value)) {
      hydrateForm();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-6">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-4 flex flex-wrap items-start gap-3">
        <BackButton />
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-slate-900">Account settings</h1>
          <p class="text-sm text-slate-600">
            Update key account details. Changes stay pending until a MotorRelay admin approves them.
          </p>
        </div>
      </header>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</label>
            <input
              v-model="form.name"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
            <input
              v-model="form.phone"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</label>
            <input
              v-model="form.company"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div v-if="auth.role === 'dealer'">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Company number</label>
            <input
              v-model="form.company_number"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Address line 1</label>
            <input
              v-model="form.address_line_one"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Address line 2</label>
            <input
              v-model="form.address_line_two"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">City</label>
            <input
              v-model="form.city"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Postcode</label>
            <input
              v-model="form.postcode"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div v-if="auth.role === 'driver'">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">DVLA share code</label>
            <input
              v-model="form.driver_dvla_code"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="A1B2C3"
            />
          </div>
          <div v-if="auth.role === 'dealer' || auth.role === 'driver'">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Passport number</label>
            <input
              v-model="form.passport_number"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="123456789"
            />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for admin</label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Add supporting context for the MotorRelay team (optional)"
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="submitting"
          >
            <span v-if="submitting">Sending...</span>
            <span v-else>Submit for review</span>
          </button>
          <p class="text-xs text-slate-500">
            Changes apply only after a MotorRelay admin approves them. You’ll be notified once actioned.
          </p>
        </div>

        <p v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {{ successMessage }}
        </p>
        <p v-if="errorMessage" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {{ errorMessage }}
        </p>
      </form>

      <div
        v-if="dealerDocuments.length"
        class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <h2 class="text-sm font-semibold text-slate-900">Dealer documents on file</h2>
        <p class="mt-1 text-xs text-slate-500">
          These documents were submitted during dealer verification. Contact support if you need to replace them.
        </p>
        <ul class="mt-3 space-y-2">
          <li
            v-for="doc in dealerDocuments"
            :key="doc.label"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ doc.label }}</p>
              <p class="text-xs text-slate-500">
                {{ doc.name || 'Document uploaded' }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <a
                v-if="doc.url"
                :href="doc.url"
                target="_blank"
                rel="noopener"
                class="text-xs font-semibold text-emerald-600 hover:underline"
              >
                View
              </a>
              <span v-else class="text-xs text-slate-500">{{ doc.path }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div
        v-if="driverDocuments.length"
        class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <h2 class="text-sm font-semibold text-slate-900">Driver verification documents</h2>
        <p class="mt-1 text-xs text-slate-500">
          Identity checks stay on file once your driver account is accepted. Contact support if updates are required.
        </p>
        <ul class="mt-3 space-y-2">
          <li
            v-for="doc in driverDocuments"
            :key="doc.label"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ doc.label }}</p>
              <p class="text-xs text-slate-500">
                {{ doc.name || 'Document uploaded' }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <a
                v-if="doc.url"
                :href="doc.url"
                target="_blank"
                rel="noopener"
                class="text-xs font-semibold text-emerald-600 hover:underline"
              >
                View
              </a>
              <span v-else class="text-xs text-slate-500">{{ doc.path }}</span>
            </div>
          </li>
        </ul>
      </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Change history</h2>
          <p class="text-xs text-slate-500">
            Track pending and recently reviewed account updates.
          </p>
        </div>
      </header>

      <div
        v-if="loadingRequests"
        class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        Loading account requests...
      </div>

      <div
        v-else-if="!requests.length"
        class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        No account change requests yet.
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="request in requests"
          :key="request.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">
                Submitted {{ request.created_at ? new Date(request.created_at).toLocaleString() : '--' }}
              </p>
              <p class="text-xs text-slate-500">
                Status:
                <span
                  class="font-semibold"
                  :class="{
                    'text-emerald-600': request.status === 'approved',
                    'text-amber-600': request.status === 'pending',
                    'text-rose-600': request.status === 'rejected'
                  }"
                >
                  {{ request.status }}
                </span>
              </p>
            </div>
            <p v-if="request.reviewed_at" class="text-xs text-slate-500">
              Reviewed {{ new Date(request.reviewed_at).toLocaleString() }}
            </p>
          </div>

          <pre class="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{{ JSON.stringify(request.payload, null, 2) }}</pre>

          <p v-if="request.admin_notes" class="mt-2 rounded-xl bg-emerald-50 p-2 text-xs text-emerald-700">
            Admin note: {{ request.admin_notes }}
          </p>
        </article>
      </div>
      </section>
    </div>

    <aside class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Need support?</h2>
      <p class="text-sm text-slate-600">
        Our team can help update registration details, transfer ownership, or verify documents faster if you submit
        accurate company information.
      </p>
      <div class="space-y-2 text-xs text-slate-500">
        <p>Email: <a class="font-semibold text-emerald-600 hover:underline" href="mailto:support@motorrelay.com">support@motorrelay.com</a></p>
        <p>Phone: <span class="font-semibold text-slate-700">0161 000 1122</span></p>
      </div>
      <RouterLink
        to="/profile/completed"
        class="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        View completed jobs
      </RouterLink>
    </aside>
  </div>
</template>
