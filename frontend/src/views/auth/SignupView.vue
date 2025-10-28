<script setup>
import { reactive, ref } from 'vue';
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
  plan: 'Starter'
});

const submitting = ref(false);
const errorMessage = ref('');

async function submit() {
  submitting.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.post('/auth/register', form);
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
</script>

<template>
  <div class="mx-auto max-w-md space-y-6 rounded-2xl border bg-white p-6">
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
