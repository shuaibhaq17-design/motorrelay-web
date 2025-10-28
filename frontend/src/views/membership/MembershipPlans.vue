<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const role = computed(() => auth.role);
const showDriverFeatures = computed(() => role.value === 'driver' || !role.value);
const showDealerFeatures = computed(() => role.value === 'dealer' || role.value === 'admin' || !role.value);

const plans = [
  {
    id: 'bronze',
    name: 'Bronze',
    price: '£0',
    description: 'Core tools for independents getting started with MotorRelay.',
    drivers: [
      'Access to local job board',
      'Up to 5 job applications per day',
      'Manual invoice downloads',
      'Community support centre'
    ],
    dealers: [
      'Post up to 5 jobs per month',
      'Daily job view analytics',
      'Email notifications for run updates',
      'Single user seat'
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    price: '£29/mo',
    description: 'Productivity perks for growing driver fleets and active dealers.',
    drivers: [
      'Planner dashboard & saved routes',
      'Priority chat support',
      'Instant payout eligibility',
      'Job search radius up to 100 miles'
    ],
    dealers: [
      'Post up to 40 jobs per month',
      '2 urgent boosts included monthly',
      'Shared inbox for team co-ordination',
      'Automated invoice exports'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '£79/mo',
    description: 'Enterprise assistance for nationwide drivers and high-volume dealers.',
    drivers: [
      'Unlimited job applications',
      'Dedicated account manager',
      'Same-day fuel & expense reconciliation',
      'API hooks for telemetry integrations'
    ],
    dealers: [
      'Unlimited job posts & archived reporting',
      'Team permissions & workload routing',
      'Custom integrations & webhooks',
      'Quarterly optimisation reviews'
    ]
  }
];
</script>

<template>
  <div class="space-y-4">
    <header class="space-y-1 text-center">
      <h1 class="text-3xl font-bold text-slate-900">Membership</h1>
      <p class="text-sm text-slate-600">Choose a plan that matches your MotorRelay workflow.</p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <article
        v-for="plan in plans"
        :key="plan.id"
        class="tile flex flex-col gap-5 p-6 text-left"
      >
        <header>
          <h2 class="text-xl font-semibold text-slate-900">{{ plan.name }}</h2>
          <p class="text-3xl font-extrabold text-emerald-600">{{ plan.price }}</p>
          <p class="mt-2 text-sm text-slate-600">{{ plan.description }}</p>
        </header>

        <div class="space-y-4 text-sm text-slate-600">
          <section v-if="showDriverFeatures">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Drivers</h3>
            <ul class="mt-2 space-y-2">
              <li
                v-for="driverFeature in plan.drivers"
                :key="`driver-${plan.id}-${driverFeature}`"
                class="flex items-center gap-2"
              >
                <span class="text-emerald-500">✔</span>
                <span>{{ driverFeature }}</span>
              </li>
            </ul>
          </section>
          <section v-if="showDealerFeatures">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Dealers</h3>
            <ul class="mt-2 space-y-2">
              <li
                v-for="dealerFeature in plan.dealers"
                :key="`dealer-${plan.id}-${dealerFeature}`"
                class="flex items-center gap-2"
              >
                <span class="text-emerald-500">✔</span>
                <span>{{ dealerFeature }}</span>
              </li>
            </ul>
          </section>
        </div>

        <button
          type="button"
          class="mt-auto rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Select
        </button>
      </article>
    </div>
  </div>
</template>
