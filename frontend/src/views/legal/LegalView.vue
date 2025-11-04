<script setup>
import BackButton from '@/components/BackButton.vue';

const legalSections = [
  {
    title: 'Terms of Service',
    summary:
      'MotorRelay connects dealerships with vetted drivers. Posting or accepting work binds you to honour job details, timelines, and payment terms. Disputes may result in temporary or permanent suspension.'
  },
  {
    title: 'Privacy & GDPR',
    summary:
      'We process account information to verify identities, manage compliance, and enable payouts. Data is stored in the UK/EU and handled under GDPR. You can request exports or deletion by contacting support.'
  },
  {
    title: 'Insurance & Liability',
    summary:
      'Dealers confirm appropriate trade insurance and driver cover before posting jobs. Drivers confirm vehicles are road legal and appropriately insured for MotorRelay work.'
  },
  {
    title: 'Payments & Invoices',
    summary:
      'MotorRelay issues invoices and release payments once proof of delivery and compliance checks pass. Fraud checks may delay payouts. Keep bank and company details up to date in Account settings.'
  },
  {
    title: 'Support & Escalations',
    summary:
      'Need help? Email support@motorrelay.com or raise a ticket inside Messages. Critical incidents should be reported within 24 hours for prompt investigation.'
  }
];
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start gap-3">
      <BackButton />
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-slate-900">Legal &amp; compliance</h1>
        <p class="text-sm text-slate-600">
          Key points about how MotorRelay operates, protects your data, and supports fair, safe deliveries.
        </p>
      </div>
    </header>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="space-y-4">
        <article
          v-for="section in legalSections"
          :key="section.title"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <h2 class="text-lg font-semibold text-slate-900">
            {{ section.title }}
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            {{ section.summary }}
          </p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">Need something in writing?</h2>
      <p class="mt-2 text-sm text-slate-600">
        Download a PDF copy of our core policies or request a signed agreement for enterprise onboarding.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href="mailto:support@motorrelay.com?subject=Legal%20Documentation%20Request"
          class="rounded-2xl border border-slate-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Request signed agreement
        </a>
        <a
          href="mailto:support@motorrelay.com?subject=GDPR%20Data%20Export"
          class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow"
        >
          Request GDPR data export
        </a>
      </div>
    </section>
  </div>
</template>
