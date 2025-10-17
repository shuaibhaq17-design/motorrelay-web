<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';
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

const completedJobs = computed(() => {
  const jobs = Array.isArray(auth.completedJobs) ? auth.completedJobs : [];
  return [...jobs].sort((a, b) => {
    const aTime = new Date(a?.created_at ?? 0).getTime();
    const bTime = new Date(b?.created_at ?? 0).getTime();
    return bTime - aTime;
  });
});

const hasCompletedJobs = computed(() => completedJobs.value.length > 0);
const recentCompletedJobs = computed(() => completedJobs.value.slice(0, 8));

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

function formatPrice(value) {
  return priceFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const profileLinks = [
  {
    to: '/scorecard',
    title: 'Scorecard',
    description: 'View rating, jobs, and reviews'
  },
  {
    to: '/profile/jobs',
    title: 'Jobs',
    description: 'All completed jobs & invoices'
  },
  {
    to: '/invoices',
    title: 'Invoice builder',
    description: 'Create standalone invoices'
  },
  {
    to: '/account',
    title: 'Account settings',
    description: 'Manage your details'
  },
  {
    to: '/legal',
    title: 'Legal',
    description: 'GDPR, Terms, Licensing'
  },
  {
    to: '/plans',
    title: 'Membership',
    description: 'Pick a plan and manage benefits'
  }
];
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

        <div class="mt-6">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">Completed &amp; closed jobs</h3>
            <span class="text-xs text-slate-500">
              Showing latest {{ recentCompletedJobs.length }} of {{ completedJobs.length }}
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            Jobs marked as <span class="font-semibold">completed</span> or <span class="font-semibold">closed</span> appear here for quick reference.
          </p>

          <div
            v-if="!hasCompletedJobs"
            class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
          >
            You have no completed or closed jobs yet.
          </div>

          <div v-else class="mt-4 space-y-3">
            <article
              v-for="job in recentCompletedJobs"
              :key="job.id"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="text-base font-semibold text-slate-900">
                    {{ formatPrice(job.price) }}
                  </div>
                  <p class="text-xs text-slate-500">
                    Completed {{ formatDate(job.created_at) }}
                  </p>
                </div>
                <span class="badge bg-emerald-100 text-emerald-700">
                  {{ job.status }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-700">
                {{ job.title || job.company || 'MotorRelay job' }}
              </p>
              <p class="text-xs text-slate-500">
                {{ job.pickup_postcode || '??' }} -> {{ job.dropoff_postcode || '??' }}
              </p>
            </article>
          </div>
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
    </aside>
  </div>
</template>



