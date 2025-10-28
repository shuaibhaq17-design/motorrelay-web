<script setup>
import { computed, inject } from 'vue';

const dashboard = inject('adminDashboard');

const plans = computed(() => dashboard?.value?.plans || {});
const tiers = computed(() => plans.value.tiers || []);
const alerts = computed(() => plans.value.alerts || {});

const mixSummary = computed(() => {
  const mix = alerts.value.mix || {};
  const entries = Object.entries(mix)
    .filter(([, count]) => count)
    .map(([plan, count]) => `${plan}: ${count}`);
  return entries.length ? entries.join(', ') : 'No active subscriptions yet.';
});
</script>

<template>
  <div class="space-y-6">
    <section class="tile rounded-2xl bg-white p-6">
      <header class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">Membership plans</h2>
          <p class="text-sm text-slate-600">Manage plan tiers and billing signals.</p>
        </div>
        <span class="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase text-emerald-700">
          {{ alerts.active_subscriptions ?? 0 }} active subscribers
        </span>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="tier in tiers"
          :key="tier.name"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <header>
            <h3 class="text-lg font-semibold text-slate-900">{{ tier.label }}</h3>
            <div class="text-sm text-emerald-700">{{ tier.price_label }}</div>
          </header>
          <ul class="mt-4 space-y-2 text-sm text-slate-600">
            <li v-for="feature in tier.features" :key="feature" class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{{ feature }}</span>
            </li>
          </ul>

          <footer class="mt-5">
            <div class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Subscribers: {{ tier.subscribers ?? 0 }}
            </div>
          </footer>
        </article>
      </div>
    </section>

    <section class="tile rounded-2xl bg-white p-6">
      <header class="mb-3">
        <h2 class="text-lg font-semibold text-slate-900">Billing alerts</h2>
        <p class="text-sm text-slate-600">Signals that might need attention.</p>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="text-xs font-semibold uppercase text-slate-500">Past-due accounts</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ alerts.past_due_accounts ?? 0 }}</div>
          <p class="text-xs text-slate-500">Reach out to unblock customers.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="text-xs font-semibold uppercase text-slate-500">Total active subscriptions</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">{{ alerts.active_subscriptions ?? 0 }}</div>
          <p class="text-xs text-slate-500">Across all plan tiers.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="text-xs font-semibold uppercase text-slate-500">Plan mix</div>
          <div class="mt-2 text-sm font-semibold text-emerald-700">
            {{ mixSummary }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

