<script setup>
import { computed, inject } from 'vue';

const dashboard = inject('adminDashboard');
const refresh = inject('refreshAdminDashboard', () => {});

const content = computed(() => dashboard?.value?.content || {});
const announcements = computed(() => content.value.announcements || []);
const legalLinks = computed(() => content.value.legal_links || []);
const featureFlags = computed(() => content.value.feature_flags || []);
</script>

<template>
  <div class="space-y-6">
    <section class="tile rounded-2xl bg-white p-6">
      <header class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">Content &amp; messaging</h2>
          <p class="text-sm text-slate-600">Control homepage banners, legal links, and feature toggles.</p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          @click="refresh"
        >
          Refresh data
        </button>
      </header>

      <div class="grid gap-4 lg:grid-cols-3">
        <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <header class="mb-3 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-slate-900">Homepage announcements</h3>
              <p class="text-xs text-slate-500">Quick promotions or release notes.</p>
            </div>
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
              disabled
            >
              + Add
            </button>
          </header>
          <ul class="space-y-2 text-sm text-slate-600">
            <li
              v-for="(item, index) in announcements"
              :key="index"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <span>{{ item }}</span>
              <button
                type="button"
                class="text-xs font-semibold text-emerald-600 hover:underline"
                disabled
              >
                Remove
              </button>
            </li>
            <li v-if="!announcements.length" class="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-slate-400">
              No announcements configured.
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <header class="mb-3">
            <h3 class="text-sm font-semibold text-slate-900">Legal links</h3>
            <p class="text-xs text-slate-500">Ensure compliance and transparency.</p>
          </header>
          <ul class="space-y-2 text-sm text-slate-600">
            <li
              v-for="link in legalLinks"
              :key="link.label"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <span>{{ link.label }}</span>
              <span class="text-xs text-slate-400">{{ link.url }}</span>
            </li>
            <li v-if="!legalLinks.length" class="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-slate-400">
              No legal links configured.
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <header class="mb-3">
            <h3 class="text-sm font-semibold text-slate-900">Feature flags</h3>
            <p class="text-xs text-slate-500">Toggle experiments and rollout controls.</p>
          </header>
          <ul class="space-y-2 text-sm text-slate-600">
            <li
              v-for="flag in featureFlags"
              :key="flag.key"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <div>
                <div class="font-semibold text-slate-900">{{ flag.label }}</div>
                <div class="text-xs text-slate-400 uppercase tracking-wide">{{ flag.key }}</div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="flag.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
              >
                {{ flag.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </li>
            <li v-if="!featureFlags.length" class="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-slate-400">
              No feature flags configured.
            </li>
          </ul>
        </section>
      </div>
    </section>
  </div>
</template>

