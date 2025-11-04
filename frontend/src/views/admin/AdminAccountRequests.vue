<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue';
import { fetchAdminAccountRequests, decideAdminAccountRequest } from '@/services/account';

const statusFilter = ref('pending');
const requests = ref([]);
const loading = ref(false);
const errorMessage = ref('');

const dashboard = inject('adminDashboard', computed(() => ({})));
const refreshAdminDashboard = inject('refreshAdminDashboard', async () => {});

async function loadRequests() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await fetchAdminAccountRequests({ status: statusFilter.value });
    requests.value = Array.isArray(payload?.data) ? payload.data : payload?.data?.data ?? [];
  } catch (error) {
    console.error('Failed to load account requests', error);
    errorMessage.value = error.response?.data?.message || 'Unable to load account change requests.';
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleDecision(requestId, decision) {
  if (!requestId) return;

  const notes = decision === 'rejected'
    ? window.prompt('Add a note for the customer (optional)', '') ?? null
    : null;

  try {
    await decideAdminAccountRequest(requestId, {
      decision,
      admin_notes: notes
    });
    await Promise.all([loadRequests(), refreshAdminDashboard()]);
  } catch (error) {
    console.error('Failed to update request', error);
    window.alert(error.response?.data?.message || 'Unable to update this request.');
  }
}

const pendingSummary = computed(() => dashboard.value?.account_updates?.pending ?? []);

onMounted(loadRequests);

watch(statusFilter, loadRequests);
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">Account update requests</h1>
          <p class="text-xs text-slate-500">
            Review profile changes submitted by dealers and drivers. Approvals immediately update their account.
          </p>
        </div>
        <div class="flex gap-2 text-xs font-semibold">
          <button
            v-for="option in ['pending', 'approved', 'rejected']"
            :key="option"
            type="button"
            class="rounded-full px-4 py-1 transition"
            :class="
              statusFilter === option
                ? 'bg-emerald-500 text-white shadow'
                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            "
            @click="statusFilter = option"
          >
            {{ option.charAt(0).toUpperCase() + option.slice(1) }}
          </button>
        </div>
      </header>

      <div v-if="pendingSummary.length" class="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
        <p class="font-semibold text-amber-900">Pending requests: {{ pendingSummary.length }}</p>
        <p class="mt-1">Review these soon to keep account data accurate.</p>
      </div>

      <div v-if="errorMessage" class="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
        {{ errorMessage }}
      </div>

      <div v-else-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading requests...
      </div>

      <div v-else-if="!requests.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No {{ statusFilter }} requests right now.
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="request in requests"
          :key="request.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <header class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">
                {{ request.user?.name || 'MotorRelay user' }}
              </p>
              <p class="text-xs text-slate-500">
                Submitted {{ request.created_at ? new Date(request.created_at).toLocaleString() : '--' }}
              </p>
            </div>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold"
              :class="{
                'bg-emerald-100 text-emerald-700': request.status === 'approved',
                'bg-amber-100 text-amber-700': request.status === 'pending',
                'bg-rose-100 text-rose-700': request.status === 'rejected'
              }"
            >
              {{ request.status }}
            </span>
          </header>

          <dl class="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
            <div>
              <dt class="uppercase tracking-wide text-slate-500">Email</dt>
              <dd class="font-semibold text-slate-900">{{ request.user?.email || '—' }}</dd>
            </div>
            <div>
              <dt class="uppercase tracking-wide text-slate-500">Phone</dt>
              <dd class="font-semibold text-slate-900">{{ request.user?.phone || '—' }}</dd>
            </div>
            <div class="md:col-span-2">
              <dt class="uppercase tracking-wide text-slate-500">Change payload</dt>
              <dd class="rounded-xl bg-slate-50 p-3 text-slate-700">
                <pre class="whitespace-pre-wrap text-xs">{{ request.payload }}</pre>
              </dd>
            </div>
            <div v-if="request.admin_notes" class="md:col-span-2">
              <dt class="uppercase tracking-wide text-slate-500">Admin notes</dt>
              <dd class="rounded-xl bg-emerald-50 p-2 text-emerald-700">{{ request.admin_notes }}</dd>
            </div>
          </dl>

          <footer
            v-if="request.status === 'pending'"
            class="mt-4 flex flex-wrap gap-2"
          >
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              @click="handleDecision(request.id, 'approved')"
            >
              Approve &amp; apply
            </button>
            <button
              type="button"
              class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              @click="handleDecision(request.id, 'rejected')"
            >
              Reject
            </button>
          </footer>
        </article>
      </div>
    </section>
  </div>
</template>
