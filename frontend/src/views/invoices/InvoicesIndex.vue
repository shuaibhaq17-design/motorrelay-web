<script setup>
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const invoices = ref([]);
const loading = ref(false);
const errorMessage = ref('');

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2
});

async function loadInvoices() {
  if (!auth.token) {
    errorMessage.value = 'Log in to view invoices.';
    invoices.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get('/invoices');
    invoices.value = Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error('Failed to load invoices', error);
    errorMessage.value = 'Unable to reach the invoices API. Showing sample data.';
    invoices.value = [
      { id: 'inv-1001', total: 128.5, status: 'sent', issued_at: new Date().toISOString(), job_ref: 'demo-1' }
    ];
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  loadInvoices();
});
</script>

<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Invoices</h1>
      <p class="text-sm text-slate-600">
        Generate and share invoices instantly after each delivery.
      </p>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading invoices&hellip;
    </div>

    <table v-else class="min-w-full divide-y divide-slate-200 overflow-hidden rounded-2xl border bg-white">
      <thead class="bg-slate-50">
        <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <th class="px-4 py-3">Invoice</th>
          <th class="px-4 py-3">Job</th>
          <th class="px-4 py-3">Total</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3">Issued</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 text-sm text-slate-700">
        <tr v-for="invoice in invoices" :key="invoice.id">
          <td class="px-4 py-3 font-semibold text-slate-900">
            {{ invoice.id }}
          </td>
          <td class="px-4 py-3">
            {{ invoice.job_ref || '—' }}
          </td>
          <td class="px-4 py-3">
            {{ currency.format(Number(invoice.total ?? 0)) }}
          </td>
          <td class="px-4 py-3">
            <span class="badge bg-emerald-100 text-emerald-700">
              {{ invoice.status || 'draft' }}
            </span>
          </td>
          <td class="px-4 py-3">
            {{ invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
