<script setup>
import { onMounted, ref } from 'vue';
import { fetchInvoices, downloadInvoice } from '@/services/invoices';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const invoices = ref([]);
const loading = ref(false);
const downloadingId = ref(null);
const errorMessage = ref('');

function formatCurrency(value, currencyCode = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode || 'GBP',
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  } catch {
    return `${currencyCode} ${Number(value || 0).toFixed(2)}`;
  }
}

async function loadInvoices() {
  if (!auth.token) {
    errorMessage.value = 'Log in to view invoices.';
    invoices.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await fetchInvoices();
    invoices.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error('Failed to load invoices', error);
    errorMessage.value = 'Unable to load invoices right now.';
    invoices.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleDownload(invoice) {
  if (!invoice?.id) return;

  downloadingId.value = invoice.id;
  try {
    const response = await downloadInvoice(invoice.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.number || invoice.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download invoice', error);
    alert('We could not download this invoice. Please try again later.');
  } finally {
    downloadingId.value = null;
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
        Generate and share MotorRelay invoices instantly after each delivery.
      </p>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading invoices...
    </div>

    <div v-else-if="!invoices.length" class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
      No invoices yet. Approved jobs will appear here once completion is signed off.
    </div>

    <div v-else class="space-y-4">
      <div class="hidden md:block">
        <table class="min-w-full divide-y divide-slate-200 overflow-hidden rounded-2xl border bg-white">
          <thead class="bg-slate-50">
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Invoice</th>
              <th class="px-4 py-3">Job</th>
              <th class="px-4 py-3">Subtotal</th>
              <th class="px-4 py-3">VAT</th>
              <th class="px-4 py-3">Total</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Issued</th>
              <th class="px-4 py-3 sr-only">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-sm text-slate-700">
            <tr v-for="invoice in invoices" :key="invoice.id">
              <td class="px-4 py-3 font-semibold text-slate-900">
                {{ invoice.number || invoice.id }}
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-slate-800">
                  {{ invoice.job?.title || `Job #${invoice.job?.id ?? '--'}` }}
                </div>
                <div class="text-xs text-slate-500">
                  Job ID: {{ invoice.job?.id ?? '--' }}
                </div>
              </td>
              <td class="px-4 py-3">
                {{ formatCurrency(invoice.subtotal, invoice.currency) }}
              </td>
              <td class="px-4 py-3">
                {{ formatCurrency(invoice.vat_total, invoice.currency) }}
              </td>
              <td class="px-4 py-3">
                {{ formatCurrency(invoice.total, invoice.currency) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="badge"
                  :class="{
                    'bg-emerald-100 text-emerald-700': invoice.status === 'finalized',
                    'bg-amber-100 text-amber-700': invoice.status === 'draft',
                    'bg-slate-200 text-slate-700': !invoice.status
                  }"
                >
                  {{ invoice.status || 'draft' }}
                </span>
              </td>
              <td class="px-4 py-3">
                {{ invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '--' }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  :disabled="!invoice.pdf_available || downloadingId === invoice.id"
                  @click="handleDownload(invoice)"
                >
                  <span v-if="downloadingId === invoice.id">Downloading...</span>
                  <span v-else>Download PDF</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 md:hidden">
        <article
          v-for="invoice in invoices"
          :key="`card-${invoice.id}`"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <header class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">
                {{ invoice.number || invoice.id }}
              </p>
              <p class="text-xs text-slate-500">
                {{ invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : 'Not issued' }}
              </p>
            </div>
            <span
              class="badge"
              :class="{
                'bg-emerald-100 text-emerald-700': invoice.status === 'finalized',
                'bg-amber-100 text-amber-700': invoice.status === 'draft',
                'bg-slate-200 text-slate-700': !invoice.status
              }"
            >
              {{ invoice.status || 'draft' }}
            </span>
          </header>

          <dl class="mt-3 grid gap-2 text-xs text-slate-600">
            <div>
              <dt class="font-semibold uppercase tracking-wide text-slate-500">Job</dt>
              <dd class="text-sm font-medium text-slate-900">
                {{ invoice.job?.title || `Job #${invoice.job?.id ?? '--'}` }}
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-semibold uppercase tracking-wide text-slate-500">Subtotal</dt>
              <dd class="text-sm font-semibold text-slate-900">
                {{ formatCurrency(invoice.subtotal, invoice.currency) }}
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-semibold uppercase tracking-wide text-slate-500">VAT</dt>
              <dd class="text-sm font-semibold text-slate-900">
                {{ formatCurrency(invoice.vat_total, invoice.currency) }}
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-semibold uppercase tracking-wide text-slate-500">Total</dt>
              <dd class="text-sm font-semibold text-emerald-700">
                {{ formatCurrency(invoice.total, invoice.currency) }}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            class="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            :disabled="!invoice.pdf_available || downloadingId === invoice.id"
            @click="handleDownload(invoice)"
          >
            <span v-if="downloadingId === invoice.id">Downloading...</span>
            <span v-else>Download PDF</span>
          </button>
        </article>
      </div>
    </div>
  </div>
</template>


