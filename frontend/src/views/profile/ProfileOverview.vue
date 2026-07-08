<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';
import ProfileScorecard from './ProfileScorecard.vue';
import { disconnectDriverPayoutAccount, startDriverPayoutOnboarding } from '@/services/payments';

const auth = useAuthStore();
const payoutSetupLoading = ref(false);
const payoutDisconnectLoading = ref(false);
const payoutSetupError = ref('');

const isDriver = computed(() => auth.role === 'driver');
const hasStripePayoutAccount = computed(() => Boolean(auth.user?.stripe_account_id));
const payoutsEnabled = computed(() => Boolean(auth.user?.stripe_payouts_enabled || auth.user?.stripe_onboarding_complete));
const payoutCardTitle = computed(() => {
  if (payoutsEnabled.value) return 'Stripe payouts connected';
  if (hasStripePayoutAccount.value) return 'Stripe payout setup started';
  return 'Set up Stripe payouts';
});
const payoutCardText = computed(() => {
  if (payoutsEnabled.value) {
    return 'Your Stripe payout account is connected. MotorRelay can release payment after delivery proof is approved.';
  }
  if (hasStripePayoutAccount.value) {
    return 'Your Stripe payout account exists. If Stripe still needs information, use the button to finish or update setup.';
  }
  return 'Add your bank details securely with Stripe so MotorRelay can release payment after delivery proof is approved.';
});

const isStarterPlan = computed(() => auth.isStarter);
const planUsage = computed(() => auth.usage || {});
const planLimits = computed(() => auth.planLimits || {});
const starterUsage = computed(() => ({
  jobPosts: {
    used: planUsage.value.job_posts_this_month ?? 0,
    limit: planLimits.value.monthly_job_posts ?? null
  },
  urgentBoosts: {
    used: planUsage.value.urgent_boosts_used ?? 0,
    limit: planLimits.value.urgent_boost_per_month ?? null
  },
  applications: {
    used: planUsage.value.applications_today ?? 0,
    limit: planLimits.value.daily_applications ?? null
  }
}));

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

async function handlePayoutSetup() {
  payoutSetupLoading.value = true;
  payoutSetupError.value = '';

  try {
    const payload = await startDriverPayoutOnboarding();
    if (payload?.url) {
      window.location.href = payload.url;
      return;
    }
    throw new Error('Stripe did not return an onboarding link.');
  } catch (error) {
    console.error('Failed to start Stripe onboarding', error);
    payoutSetupError.value = error.response?.data?.message || error.message || 'Could not start payout setup.';
  } finally {
    payoutSetupLoading.value = false;
  }
}

async function handlePayoutDisconnect() {
  if (!window.confirm('Disconnect Stripe payouts? You will not be able to receive driver payouts until you set this up again.')) {
    return;
  }

  payoutDisconnectLoading.value = true;
  payoutSetupError.value = '';

  try {
    const payload = await disconnectDriverPayoutAccount();
    auth.user = payload?.user ?? {
      ...auth.user,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false
    };
  } catch (error) {
    console.error('Failed to disconnect Stripe payout account', error);
    payoutSetupError.value = error.response?.data?.message || error.message || 'Could not disconnect payout account.';
  } finally {
    payoutDisconnectLoading.value = false;
  }
}

const profileLinks = computed(() => {
  return [
    {
      to: '/account',
      title: 'Account settings',
      description: 'Manage your details'
    },
    {
      to: '/legal',
      title: 'Legal',
      description: 'GDPR, Terms, Licensing'
    }
  ];
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
        <div v-if="isStarterPlan" class="grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Job posts this month</h3>
            <p class="mt-1 text-lg font-semibold text-emerald-900">
              {{ starterUsage.jobPosts.used }}<span v-if="starterUsage.jobPosts.limit"> / {{ starterUsage.jobPosts.limit }}</span>
            </p>
            <p class="text-xs text-emerald-700">
              Starter includes up to {{ starterUsage.jobPosts.limit || 5 }} posts monthly.
            </p>
          </div>
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Urgent boosts used</h3>
            <p class="mt-1 text-lg font-semibold text-emerald-900">
              {{ starterUsage.urgentBoosts.used }}<span v-if="starterUsage.urgentBoosts.limit"> / {{ starterUsage.urgentBoosts.limit }}</span>
            </p>
            <p class="text-xs text-emerald-700">
              Upgrade for additional boosts per month.
            </p>
          </div>
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Applications today</h3>
            <p class="mt-1 text-lg font-semibold text-emerald-900">
              {{ starterUsage.applications.used }}<span v-if="starterUsage.applications.limit"> / {{ starterUsage.applications.limit }}</span>
            </p>
            <p class="text-xs text-emerald-700">
              Starter allows a limited number of daily applications.
            </p>
          </div>
        </div>
      </section>

      <section
        v-if="isDriver"
        class="rounded-2xl border p-6"
        :class="payoutsEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'"
      >
        <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase tracking-wide" :class="payoutsEnabled ? 'text-emerald-700' : 'text-amber-700'">Driver payouts</p>
            <h2 class="mt-1 text-xl font-black" :class="payoutsEnabled ? 'text-emerald-950' : 'text-amber-950'">{{ payoutCardTitle }}</h2>
            <p class="mt-2 text-sm leading-6" :class="payoutsEnabled ? 'text-emerald-800' : 'text-amber-800'">
              {{ payoutCardText }}
            </p>
            <span
              class="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold"
              :class="payoutsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
            >
              {{ payoutsEnabled ? 'Connected' : hasStripePayoutAccount ? 'Action may be needed' : 'Not connected' }}
            </span>
          </div>
          <div class="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:flex-shrink-0 md:justify-end">
            <button
              type="button"
              class="btn-primary w-full whitespace-nowrap px-5 py-3 md:w-auto"
              :disabled="payoutSetupLoading || payoutDisconnectLoading"
              @click="handlePayoutSetup"
            >
              <span v-if="payoutSetupLoading">Opening Stripe...</span>
              <span v-else-if="payoutsEnabled">Manage payout setup</span>
              <span v-else-if="hasStripePayoutAccount">Finish payout setup</span>
              <span v-else>Set up payouts</span>
            </button>
            <button
              v-if="hasStripePayoutAccount"
              type="button"
              class="btn-secondary w-full whitespace-nowrap border-rose-200 bg-white px-5 py-3 text-rose-700 hover:bg-rose-50 md:w-auto"
              :disabled="payoutSetupLoading || payoutDisconnectLoading"
              @click="handlePayoutDisconnect"
            >
              <span v-if="payoutDisconnectLoading">Disconnecting...</span>
              <span v-else>Disconnect</span>
            </button>
          </div>
        </div>
        <p v-if="payoutSetupError" class="mt-3 text-sm text-rose-700">{{ payoutSetupError }}</p>
        <p v-else class="mt-3 text-xs" :class="payoutsEnabled ? 'text-emerald-700' : 'text-amber-700'">
          MotorRelay does not store bank details. Stripe handles payout verification.
        </p>
      </section>

      <ProfileScorecard v-if="!isDriver" />
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
                {{ job.pickup_postcode || 'Pickup' }} to {{ job.dropoff_postcode || 'Drop-off' }}
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
