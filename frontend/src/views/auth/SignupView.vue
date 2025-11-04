<script setup>
import { reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'driver',
  plan: 'Starter',
  phone: '',
  company: '',
  address_line_one: '',
  address_line_two: '',
  city: '',
  postcode: '',
  company_number: '',
  passport_number: '',
  driver_dvla_code: ''
});

const submitting = ref(false);
const errorMessage = ref('');
const documents = reactive({
  trade_policy_document: null,
  trade_plate_photo: null,
  utility_bill: null,
  passport_selfie: null,
  driver_utility_bill: null,
  driver_license_front: null,
  driver_license_back: null,
  driver_passport: null,
  driver_selfie: null
});

async function submit() {
  submitting.value = true;
  errorMessage.value = '';
  try {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        payload.append(key, value);
      }
    });

    if (form.role === 'dealer') {
      Object.entries(documents).forEach(([key, value]) => {
        if (
          ['trade_policy_document', 'trade_plate_photo', 'utility_bill', 'passport_selfie'].includes(key) &&
          value
        ) {
          payload.append(key, value);
        }
      });
    } else if (form.role === 'driver') {
      Object.entries(documents).forEach(([key, value]) => {
        if (
          ['driver_utility_bill', 'driver_license_front', 'driver_license_back', 'driver_passport', 'driver_selfie'].includes(key) &&
          value
        ) {
          payload.append(key, value);
        }
      });
    }

    const { data } = await api.post('/auth/register', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    auth.setSession({
      token: data?.token || null,
      user: data?.user || null,
      plan: data?.plan || null
    });
    await auth.fetchMe().catch(() => null);
    router.push('/onboarding');
  } catch (error) {
    console.error('Signup failed', error);
    errorMessage.value = error.response?.data?.message || 'Sign up failed. Try again later.';
  } finally {
    submitting.value = false;
  }
}

watch(
  () => form.role,
  (role) => {
    if (role !== 'dealer') {
      form.company = '';
      form.address_line_one = '';
      form.address_line_two = '';
      form.city = '';
      form.postcode = '';
      form.company_number = '';
      documents.trade_policy_document = null;
      documents.trade_plate_photo = null;
      documents.utility_bill = null;
      documents.passport_selfie = null;
    }
    if (role !== 'driver') {
      form.driver_dvla_code = '';
      documents.driver_utility_bill = null;
      documents.driver_license_front = null;
      documents.driver_license_back = null;
      documents.driver_passport = null;
      documents.driver_selfie = null;
    }
  }
);
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Create your MotorRelay account</h1>
      <p class="text-sm text-slate-600">Drivers and dealers join to post, accept and track jobs.</p>
    </header>

    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="text-sm font-semibold text-slate-700">Full name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Password</label>
        <input
          v-model="form.password"
          type="password"
          minlength="8"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Role</label>
        <select
          v-model="form.role"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="driver">Driver</option>
          <option value="dealer">Dealer</option>
        </select>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-semibold text-slate-700">Phone</label>
          <input
            v-model="form.phone"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="07123 456789"
          />
        </div>
        <div v-if="form.role === 'dealer'">
          <label class="text-sm font-semibold text-slate-700">Company name</label>
          <input
            v-model="form.company"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="MotorRelay Motors"
          />
        </div>
      </div>

      <div v-if="form.role === 'dealer'" class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-slate-700">Company number</label>
          <input
            v-model="form.company_number"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="12345678"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">Address line 1</label>
          <input
            v-model="form.address_line_one"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Unit 12, Industrial Estate"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">Address line 2 (optional)</label>
          <input
            v-model="form.address_line_two"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Business Park"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">City</label>
          <input
            v-model="form.city"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Manchester"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">Postcode</label>
          <input
            v-model="form.postcode"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="M1 2AB"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">Passport number</label>
          <input
            v-model="form.passport_number"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="123456789"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-semibold text-slate-700">Trade policy document</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.trade_policy_document = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Trade plates photo</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.trade_plate_photo = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Utility bill (business)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.utility_bill = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Director/CEO selfie</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.passport_selfie = e.target.files?.[0] ?? null)"
            />
          </div>
        </div>
        <p class="text-xs text-slate-500">
          These documents help us verify legitimate dealership accounts and keep the marketplace secure.
        </p>
      </div>

      <div v-else-if="form.role === 'driver'" class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-slate-700">DVLA share code</label>
          <input
            v-model="form.driver_dvla_code"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="A1B2C3"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700">Passport number</label>
          <input
            v-model="form.passport_number"
            type="text"
            required
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="123456789"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-semibold text-slate-700">Utility bill (matching your name)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.driver_utility_bill = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Passport photo</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.driver_passport = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Driving licence (front)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.driver_license_front = e.target.files?.[0] ?? null)"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700">Driving licence (back)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.driver_license_back = e.target.files?.[0] ?? null)"
            />
          </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-semibold text-slate-700">Selfie for verification</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              required
              class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
              @change="(e) => (documents.driver_selfie = e.target.files?.[0] ?? null)"
            />
          </div>
        </div>
        <p class="text-xs text-slate-500">
          These checks help us verify driver identity and DVLA eligibility.
        </p>
      </div>

      <div>
        <label class="text-sm font-semibold text-slate-700">Membership plan</label>
        <select
          v-model="form.plan"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="Starter">Starter</option>
          <option value="Gold Driver">Gold Driver</option>
          <option value="Dealer Pro">Dealer Pro</option>
        </select>
      <p class="mt-1 text-xs text-slate-500">
        Starter covers the basics, Gold Driver unlocks planner tools, and Dealer Pro supports multi-site dealerships.
      </p>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

      <button
        type="submit"
        class="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="submitting"
      >
        <span v-if="submitting">Creating account...</span>
        <span v-else>Sign up</span>
      </button>
    </form>

    <p class="text-sm text-slate-600">
      Already have an account?
      <RouterLink to="/login" class="font-semibold text-emerald-600 hover:underline">
        Log in
      </RouterLink>
    </p>
  </div>
</template>
