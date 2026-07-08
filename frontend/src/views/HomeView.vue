<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { fetchJobHighlights } from '@/services/jobs';

const auth = useAuthStore();
const jobs = ref([]);
const loading = ref(false);

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
});

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }

  loading.value = true;
  try {
    const payload = await fetchJobHighlights();
    jobs.value = Array.isArray(payload?.jobs) ? payload.jobs : [];
  } catch (error) {
    console.error('Failed to load highlight jobs', error);
    jobs.value = [];
  } finally {
    loading.value = false;
  }
});

const roleLabel = computed(() => {
  if (auth.role === 'driver') return 'Driver workspace';
  if (auth.role === 'dealer') return 'Dealer workspace';
  if (auth.role === 'admin') return 'Admin workspace';
  return 'Vehicle logistics';
});

const primaryAction = computed(() => {
  if (auth.role === 'driver') return { to: '/jobs', label: 'Browse jobs' };
  if (auth.role === 'dealer') return { to: '/jobs/new', label: 'Create job' };
  if (auth.role === 'admin') return { to: '/admin', label: 'Open admin' };
  return { to: '/login', label: 'Sign in' };
});

const secondaryAction = computed(() => {
  if (auth.role === 'driver') return { to: '/driver', label: 'Driver dashboard' };
  if (auth.role === 'dealer') return { to: '/dealer', label: 'Dealer dashboard' };
  if (auth.role === 'admin') return { to: '/jobs', label: 'Review jobs' };
  return { to: '/signup', label: 'Create account' };
});

const statCards = computed(() => {
  const assigned = Array.isArray(auth.assignedJobs) ? auth.assignedJobs.length : 0;
  const posted = Array.isArray(auth.postedJobs) ? auth.postedJobs.length : 0;
  const completed = Array.isArray(auth.completedJobs) ? auth.completedJobs.length : 0;

  if (auth.role === 'driver') {
    return [
      { label: 'Assigned runs', value: assigned },
      { label: 'Completed', value: completed },
      { label: 'Plan', value: auth.planSlug || auth.plan || 'Driver' }
    ];
  }

  if (auth.role === 'dealer') {
    return [
      { label: 'Posted jobs', value: posted },
      { label: 'Completed', value: completed },
      { label: 'Plan', value: auth.planSlug || auth.plan || 'Dealer' }
    ];
  }

  return [
    { label: 'Open marketplace', value: jobs.value.length },
    { label: 'Live tracking', value: 'Built in' },
    { label: 'Invoices', value: 'PDF ready' }
  ];
});

const quickLinks = computed(() => {
  if (auth.role === 'driver') {
    return [
      { to: '/jobs', title: 'Find a run', text: 'Apply for open vehicle movements near you.' },
      { to: '/messages', title: 'Messages', text: 'Keep dealers updated from one inbox.' },
      { to: '/profile', title: 'Scorecard', text: 'Review completed work and earnings.' }
    ];
  }

  if (auth.role === 'dealer') {
    return [
      { to: '/jobs/new', title: 'Post a job', text: 'Add pickup, drop-off, vehicle, and price.' },
      { to: '/jobs', title: 'Manage runs', text: 'Assign drivers and track live progress.' },
      { to: '/invoices', title: 'Invoices', text: 'Download invoices and delivery proof.' }
    ];
  }

  if (auth.role === 'admin') {
    return [
      { to: '/admin', title: 'Overview', text: 'Monitor platform activity and health.' },
      { to: '/admin/applications', title: 'Applications', text: 'Review driver and dealer activity.' },
      { to: '/admin/system-health', title: 'System health', text: 'Spot stale jobs and conversations.' }
    ];
  }

  return [
    { to: '/signup', title: 'Drivers', text: 'Find work, submit proof, and manage invoices.' },
    { to: '/signup', title: 'Dealers', text: 'Post jobs and assign trusted drivers.' },
    { to: '/login', title: 'Operations', text: 'Track messages, expenses, and paperwork.' }
  ];
});

const onboardingSteps = computed(() => {
  if (auth.role === 'driver') {
    return [
      { title: '1. Find a job', text: 'Open the Jobs page and request a vehicle movement you can do.', to: '/jobs', action: 'Browse jobs' },
      { title: '2. Wait for assignment', text: 'The dealer reviews requests and chooses the driver.', to: '/driver', action: 'Check dashboard' },
      { title: '3. Complete the run', text: 'Deliver the vehicle, upload delivery proof, then track invoice status.', to: '/profile', action: 'View profile' }
    ];
  }

  if (auth.role === 'dealer') {
    return [
      { title: '1. Create a job', text: 'Add pickup, drop-off, vehicle details, and the price.', to: '/jobs/new', action: 'Create job' },
      { title: '2. Pick a driver', text: 'Review driver requests and assign the best person for the run.', to: '/jobs', action: 'Manage jobs' },
      { title: '3. Approve completion', text: 'Check delivery proof, approve the completed run, and download paperwork.', to: '/invoices', action: 'View invoices' }
    ];
  }

  if (auth.role === 'admin') {
    return [
      { title: '1. Review activity', text: 'Check platform jobs, users, and application status.', to: '/admin', action: 'Open admin' },
      { title: '2. Monitor jobs', text: 'Use the jobs board to spot stuck or stale runs.', to: '/jobs', action: 'Review jobs' },
      { title: '3. Check health', text: 'Use system health for operational issues.', to: '/admin/system-health', action: 'System health' }
    ];
  }

  return [
    { title: '1. Choose your role', text: 'Create a driver account to find work or a dealer account to post jobs.', to: '/signup', action: 'Create account' },
    { title: '2. Sign in', text: 'Use your account to access the correct dashboard.', to: '/login', action: 'Sign in' },
    { title: '3. Start moving vehicles', text: 'Drivers request jobs. Dealers assign drivers and approve completion.', to: '/jobs', action: 'View jobs' }
  ];
});

const standoutFeatures = [
  {
    title: 'Vetted driver network',
    text: 'Drivers submit identity and licence documents so dealers know who is moving their vehicles.'
  },
  {
    title: 'Proof-first completion',
    text: 'Every completed job needs delivery proof before approval and invoice download.'
  },
  {
    title: 'Built-in revenue model',
    text: 'MotorRelay can earn from platform fees, urgent boosts, dealer plans, and premium driver tools.'
  },
  {
    title: 'Operational control',
    text: 'Admin tools track users, jobs, conversations, billing signals, and account change requests.'
  }
];

const jobsToDisplay = computed(() => jobs.value.slice(0, 3));

const openJobsEmptyText = computed(() => {
  if (auth.role === 'driver') {
    return 'No open jobs right now. Check back later for new dealer jobs.';
  }

  if (auth.role === 'dealer') {
    return 'No open jobs yet. Create your first job to start receiving driver requests.';
  }

  return 'No open jobs yet. Jobs will appear here when dealers post them.';
});
</script>

<template>
  <div class="space-y-6">
    <section class="section-card overflow-hidden">
      <div class="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-8">
        <div class="space-y-5 sm:space-y-6">
          <div class="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 sm:text-xs sm:tracking-[0.18em]">
            {{ roleLabel }}
          </div>

          <div class="max-w-3xl space-y-4">
            <h1 class="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Move vehicles with less chasing.
            </h1>
            <p class="max-w-2xl text-sm leading-6 text-slate-600 sm:text-lg sm:leading-7">
              MotorRelay brings jobs, drivers, live tracking, expenses, messages, proof of delivery, and invoices into one clean workspace.
            </p>
          </div>

          <div class="grid gap-3 sm:flex sm:flex-wrap">
            <RouterLink :to="primaryAction.to" class="btn-primary w-full sm:w-auto">
              {{ primaryAction.label }}
            </RouterLink>
            <RouterLink :to="secondaryAction.to" class="btn-secondary w-full sm:w-auto">
              {{ secondaryAction.label }}
            </RouterLink>
          </div>

          <dl class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="stat in statCards"
              :key="stat.label"
              class="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm"
            >
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ stat.label }}</dt>
              <dd class="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">{{ stat.value }}</dd>
            </div>
          </dl>
        </div>

        <aside class="rounded-3xl bg-slate-950 p-4 text-white shadow-2xl shadow-slate-950/20 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Live board</p>
              <h2 class="mt-1 text-xl font-bold">Open jobs</h2>
            </div>
            <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {{ loading ? 'Syncing' : `${jobsToDisplay.length} shown` }}
            </span>
          </div>

          <div class="mt-5 space-y-3">
            <RouterLink
              v-for="job in jobsToDisplay"
              :key="job.id"
              :to="`/jobs/${job.id}`"
              class="block rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.1]"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <p class="font-semibold text-white">
                    {{ job.pickup_label || job.pickup_postcode || 'Pickup' }}
                    <span class="text-slate-500">to</span>
                    {{ job.dropoff_label || job.dropoff_postcode || 'Drop-off' }}
                  </p>
                  <p class="mt-1 text-xs text-slate-400">{{ job.status || 'open' }}</p>
                </div>
                <span class="w-fit rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">
                  {{ priceFormatter.format(Number(job.price || 0)) }}
                </span>
              </div>
            </RouterLink>

            <div
              v-if="!loading && !jobsToDisplay.length"
              class="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-300"
            >
              {{ openJobsEmptyText }}
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section class="section-card space-y-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">How to use this app</p>
        <h2 class="mt-1 text-xl font-black text-slate-950">Your next steps</h2>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <RouterLink
          v-for="step in onboardingSteps"
          :key="step.title"
          :to="step.to"
          class="rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
        >
          <h3 class="font-black text-slate-950">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ step.text }}</p>
          <span class="mt-4 inline-flex text-sm font-bold text-emerald-700">{{ step.action }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="section-card space-y-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">What makes this stand out</p>
        <h2 class="mt-1 text-xl font-black text-slate-950">Trust, proof, and payments in one workflow</h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          The strongest version of MotorRelay is not just a job board. It should be the safe workflow dealers use to post work, choose vetted drivers, approve evidence, and release payment.
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-4">
        <article
          v-for="feature in standoutFeatures"
          :key="feature.title"
          class="rounded-2xl border border-slate-200 bg-white/80 p-4"
        >
          <h3 class="font-black text-slate-950">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ feature.text }}</p>
        </article>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <RouterLink
        v-for="link in quickLinks"
        :key="link.title"
        :to="link.to"
        class="tile group flex min-h-[140px] flex-col justify-between p-4 transition hover:-translate-y-1 hover:shadow-2xl sm:min-h-[150px] sm:p-5"
      >
        <div>
          <h2 class="text-lg font-black text-slate-950">{{ link.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ link.text }}</p>
        </div>
        <span class="mt-5 text-sm font-bold text-emerald-700 group-hover:text-emerald-800">
          Open workspace
        </span>
      </RouterLink>
    </section>
  </div>
</template>
