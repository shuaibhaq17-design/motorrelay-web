<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import ProfileScorecard from './ProfileScorecard.vue';

const auth = useAuthStore();

const initials = computed(() => {
  if (!auth.user?.name) return 'MR';
  return auth.user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

onMounted(() => {
  if (auth.token) {
    auth.fetchMe().catch(() => null);
  }
});
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4">
      <section class="tile space-y-4 p-6">
        <header class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
            {{ initials }}
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">
              {{ auth.user?.name || 'New MotorRelay user' }}
            </h1>
            <p class="text-sm text-slate-600">
              {{ auth.user?.email || 'email@motorrelay.com' }}
            </p>
          </div>
        </header>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 p-4">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</h2>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              {{ auth.role || 'Pending' }}
            </p>
          </div>
          <div class="rounded-2xl border border-slate-200 p-4">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</h2>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              {{ auth.plan || 'Free' }}
            </p>
          </div>
        </div>
      </section>

      <ProfileScorecard />
    </div>

    <aside class="tile space-y-4 p-6">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Account</h2>
        <p class="text-sm text-slate-600">
          Manage your account details and security in the Laravel backend.
        </p>
      </div>
      <button
        type="button"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="auth.logout"
      >
        Logout
      </button>
    </aside>
  </div>
</template>
