<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';
import ProfileScorecard from './ProfileScorecard.vue';

const auth = useAuthStore();

const isDealer = computed(() => auth.role === 'dealer');
const isDriver = computed(() => auth.role === 'driver');
const showScorecard = computed(() => isDealer.value || isDriver.value);

onMounted(() => {
  if (auth.token) {
    auth.fetchMe().catch(() => null);
  }
});

const profileLinks = computed(() => {
  const links = [
    {
      to: '/account',
      title: 'Account settings',
      description: 'Manage your details'
    },
    {
      to: '/profile/completed',
      title: 'Completed jobs',
      description: 'See history with invoices and POD links'
    },
    {
      to: '/legal',
      title: 'Legal',
      description: 'GDPR, Terms, Licensing'
    }
  ];

  return links;
});
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4">
      <ProfileScorecard v-if="showScorecard" />
      <section class="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-900">Profile</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="link in profileLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
          >
            <div class="text-base font-semibold text-slate-900">
              {{ link.title }}
            </div>
            <p class="text-xs text-slate-600">
              {{ link.description }}
            </p>
          </RouterLink>
        </div>

      </section>
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

      <div
        v-if="isDriver"
        class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 text-left"
      >
        <header class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900">Start earning today</h3>
          <span class="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            Drivers
          </span>
        </header>
        <p class="text-sm text-slate-600">
          See jobs near you and apply in minutes. New runs are added daily across the UK marketplace.
        </p>
        <ul class="space-y-2 text-sm text-slate-600">
          <li class="flex items-start gap-2">
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Browse open runs filtered by distance and vehicle type.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Track applications and get notified when dealers respond.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Upload PODs and invoices straight from your workspace.</span>
          </li>
        </ul>
        <RouterLink
          to="/jobs"
          class="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Browse jobs
        </RouterLink>
      </div>
    </aside>
  </div>
</template>
