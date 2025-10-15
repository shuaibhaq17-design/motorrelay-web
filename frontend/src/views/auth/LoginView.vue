<script setup>
import { reactive, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { RouterLink, useRouter } from 'vue-router';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  email: '',
  password: ''
});

const submitting = ref(false);
const errorMessage = ref('');

async function submit() {
  submitting.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.post('/auth/login', form);
    auth.setSession({
      token: data?.token || null,
      user: data?.user || null,
      plan: data?.plan || null
    });
    router.push('/');
  } catch (error) {
    console.error('Login failed', error);
    errorMessage.value = error.response?.data?.message || 'Login failed. Check your credentials.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6 rounded-2xl border bg-white p-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Log in</h1>
      <p class="text-sm text-slate-600">
        Access your MotorRelay account to manage jobs and messaging.
      </p>
    </header>

    <form class="space-y-4" @submit.prevent="submit">
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
          required
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="submitting"
      >
        <span v-if="submitting">Signing in…</span>
        <span v-else>Sign in</span>
      </button>
    </form>

    <p class="text-sm text-slate-600">
      New to MotorRelay?
      <RouterLink to="/signup" class="font-semibold text-emerald-600 hover:underline">
        Create your account
      </RouterLink>
    </p>
  </div>
</template>
