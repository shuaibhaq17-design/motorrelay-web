<script setup>
const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: '£0',
    description: 'Browse public jobs and deliver on-demand.',
    features: ['Public marketplace access', 'Standard support']
  },
  {
    id: 'pro',
    name: 'Gold Driver',
    price: '£29/mo',
    description: 'Unlock planner tools and preferred listings.',
    features: ['Planner dashboard', 'Priority support', 'Instant payouts']
  },
  {
    id: 'dealer',
    name: 'Dealer Pro',
    price: '£79/mo',
    description: 'Dedicated support for dealerships with bulk jobs.',
    features: ['Unlimited job posts', 'Team messaging', 'Custom integrations']
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
        class="tile flex flex-col gap-4 p-6 text-left"
      >
        <header>
          <h2 class="text-xl font-semibold text-slate-900">{{ plan.name }}</h2>
          <p class="text-3xl font-extrabold text-emerald-600">{{ plan.price }}</p>
          <p class="mt-2 text-sm text-slate-600">{{ plan.description }}</p>
        </header>

        <ul class="space-y-2 text-sm text-slate-600">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center gap-2"
          >
            <span class="text-emerald-500">✔</span>
            <span>{{ feature }}</span>
          </li>
        </ul>

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
