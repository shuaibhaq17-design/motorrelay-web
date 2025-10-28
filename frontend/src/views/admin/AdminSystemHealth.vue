<script setup>
import { computed, inject } from 'vue';

const dashboard = inject('adminDashboard');

const systemHealth = computed(() => dashboard?.value?.system_health || {});
const widgets = computed(() => systemHealth.value.widgets || []);
const issues = computed(() => systemHealth.value.issues || []);
</script>

<template>
  <div class="space-y-6">
    <section class="tile rounded-2xl bg-white p-6">
      <header class="mb-4">
        <h2 class="text-xl font-semibold text-slate-900">System health</h2>
        <p class="text-sm text-slate-600">Quick checks across core workflows.</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="widget in widgets"
          :key="widget.label"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div class="text-xs font-semibold uppercase text-slate-500">{{ widget.label }}</div>
          <div class="mt-2 text-3xl font-bold text-slate-900">{{ widget.value ?? 0 }}</div>
          <p class="text-xs text-slate-600">
            {{ widget.description || 'No updates required.' }}
          </p>
        </div>
      </div>
    </section>

    <section class="tile rounded-2xl bg-white p-6">
      <header class="mb-3">
        <h2 class="text-lg font-semibold text-slate-900">Alerts &amp; warnings</h2>
        <p class="text-sm text-slate-600">Monitor surfaced errors or schema warnings.</p>
      </header>

      <ul v-if="issues.length" class="space-y-3">
        <li
          v-for="(issue, index) in issues"
          :key="index"
          class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ issue }}
        </li>
      </ul>

      <div v-else class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        No active issues detected.
      </div>
    </section>
  </div>
</template>
