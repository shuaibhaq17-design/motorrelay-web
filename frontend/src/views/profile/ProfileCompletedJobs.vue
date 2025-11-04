<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import BackButton from '@/components/BackButton.vue';

const auth = useAuthStore();

onMounted(() => {
  if (!auth.user && auth.token) {
    auth.fetchMe().catch(() => null);
  }
});

const completedJobs = computed(() => {
  const jobs = Array.isArray(auth.completedJobs) ? auth.completedJobs : [];
  return [...jobs].sort((a, b) => {
    const aTime = new Date(a?.completed_at ?? a?.created_at ?? 0).getTime();
    const bTime = new Date(b?.completed_at ?? b?.created_at ?? 0).getTime();
    return bTime - aTime;
  });
});

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

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

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '£0';
  try {
    return priceFormatter.format(Number(value) || 0);
  } catch {
    return `£${value}`;
  }
}

function resolveInvoice(job) {
  if (!job) return null;
  return (
    job.invoice_download_url ||
    job.invoice_url ||
    job.invoice ||
    job.invoice_pdf ||
    job.invoice_link ||
    null
  );
}

function resolvePod(job) {
  if (!job) return null;
  return job.pod_download_url || job.pod_url || job.proof_of_delivery_url || null;
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-6">
      <header class="flex flex-wrap items-start gap-3">
      <BackButton />
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-slate-900">Completed jobs</h1>
        <p class="text-sm text-slate-600">
          Browse the full history of completed and closed jobs, with quick links to invoices and proof of delivery.
        </p>
      </div>
    </header>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div
        v-if="!completedJobs.length"
        class="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        <p>No jobs have been marked completed yet.</p>
        <RouterLink
          to="/jobs"
          class="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Find new jobs
        </RouterLink>
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="job in completedJobs"
          :key="job.id ?? job.reference ?? job.job_reference"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow"
        >
          <header class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">
                {{ job.title || job.company || job.reference || job.job_reference || 'MotorRelay job' }}
              </h2>
              <p class="text-xs text-slate-500">
                Completed {{ formatDate(job.completed_at || job.updated_at || job.created_at) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Completed</span>
              <span class="rounded-full bg-white px-3 py-1 text-slate-600">
                {{ formatPrice(job.price ?? job.total ?? job.amount) }}
              </span>
            </div>
          </header>

          <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div class="space-y-1 rounded-2xl border border-white/70 bg-white/80 px-3 py-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pickup</dt>
              <dd class="text-sm text-slate-700">
                {{ job.pickup_label || job.pickup_postcode || job.pickup_city || '—' }}
              </dd>
            </div>
            <div class="space-y-1 rounded-2xl border border-white/70 bg-white/80 px-3 py-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Drop-off</dt>
              <dd class="text-sm text-slate-700">
                {{ job.dropoff_label || job.dropoff_postcode || job.dropoff_city || '—' }}
              </dd>
            </div>
            <div class="space-y-1 rounded-2xl border border-white/70 bg-white/80 px-3 py-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</dt>
              <dd class="text-sm text-slate-700">
                {{ job.reference || job.job_reference || job.id || '—' }}
              </dd>
            </div>
            <div class="space-y-1 rounded-2xl border border-white/70 bg-white/80 px-3 py-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver</dt>
              <dd class="text-sm text-slate-700">
                {{ job.driver_name || job.driver || job.assigned_driver_name || 'Saved in history' }}
              </dd>
            </div>
          </dl>

          <footer class="mt-4 flex flex-wrap items-center gap-3">
            <a
              v-if="resolveInvoice(job)"
              :href="resolveInvoice(job)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              View invoice
            </a>
            <a
              v-if="resolvePod(job)"
              :href="resolvePod(job)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Proof of delivery
            </a>
            <RouterLink
              v-if="job.id"
              :to="`/jobs/${job.id}`"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open job detail
            </RouterLink>
          </footer>
        </article>
      </div>
      </section>
    </div>

    <aside class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Need more detail?</h2>
      <p class="text-sm text-slate-600">
        Completed jobs store invoice and delivery evidence. Keep them updated to generate professional paperwork in seconds.
      </p>
      <RouterLink
        to="/invoices"
        class="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Go to invoices
      </RouterLink>
      <RouterLink
        to="/profile"
        class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Back to profile
      </RouterLink>
    </aside>
  </div>
</template>
