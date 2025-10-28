<script setup>
import { computed, inject } from 'vue';
import { RouterLink } from 'vue-router';

const dashboard = inject('adminDashboard');

const threads = computed(() => dashboard?.value?.conversations || []);

function formatAge(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 1) {
    return `${diffDays}d ago`;
  }
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours >= 1) {
    return `${diffHours}h ago`;
  }
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes >= 1) {
    return `${diffMinutes}m ago`;
  }
  return 'Just now';
}
</script>

<template>
  <div class="tile rounded-2xl bg-white p-6">
    <header class="mb-4">
      <h2 class="text-xl font-semibold text-slate-900">Conversations</h2>
      <p class="text-sm text-slate-600">Monitor recent activity across all message threads.</p>
    </header>

    <div v-if="!threads.length" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      No conversations yet.
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-3 font-semibold">Thread</th>
            <th class="px-4 py-3 font-semibold">Last message</th>
            <th class="px-4 py-3 font-semibold">Age</th>
            <th class="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="thread in threads" :key="thread.id" class="bg-white">
            <td class="px-4 py-3">
              <div class="font-semibold text-slate-900">{{ thread.subject || 'New Conversation' }}</div>
              <div class="text-xs text-slate-500">
                Job {{ thread.job_reference || '—' }}
              </div>
            </td>
            <td class="px-4 py-3 text-slate-700">
              <span v-if="thread.last_message">
                {{ thread.last_message }}
              </span>
              <span v-else class="text-slate-400">
                No messages yet.
              </span>
              <span
                v-if="thread.is_stale"
                class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-700"
              >
                Stale
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ formatAge(thread.updated_at) }}</td>
            <td class="px-4 py-3 text-right">
              <RouterLink
                :to="{ name: 'messages', query: { thread: thread.id } }"
                class="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Open
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

