<script setup>
import { ref } from 'vue';

const weeks = ref([
  {
    id: 'week-1',
    label: 'This Week',
    jobs: [
      { id: 'planner-1', jobId: 10, title: 'Deliver Jaguar XF', status: 'scheduled', day: 'Tue', driver: 'A. Smith' },
      { id: 'planner-2', jobId: 11, title: 'Collect Kia Sportage', status: 'scheduled', day: 'Thu', driver: 'You' }
    ]
  },
  {
    id: 'week-2',
    label: 'Next Week',
    jobs: [
      { id: 'planner-3', title: 'Deliver Tesla Model 3', status: 'draft', day: 'Mon', driver: 'TBC' }
    ]
  }
]);
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4">
      <header>
        <h1 class="text-2xl font-bold text-slate-900">Planner</h1>
        <p class="text-sm text-slate-600">
          Organise upcoming runs by week. This view replaces the Supabase-driven planner.
        </p>
      </header>

      <div class="space-y-4">
      <section
        v-for="week in weeks"
       :key="week.id"
        class="tile p-6"
      >
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">{{ week.label }}</h2>
          <span class="badge bg-emerald-100 text-emerald-700">{{ week.jobs.length }} jobs</span>
        </header>

        <ol class="space-y-2">
          <li
            v-for="job in week.jobs"
            :key="job.id"
            class="rounded-xl border border-slate-200 p-3 transition hover:border-emerald-200 hover:shadow"
          >
            <RouterLink
              v-if="job.jobId"
              :to="`/jobs/${job.jobId}`"
              class="flex items-center justify-between gap-3 text-left"
            >
              <div>
                <h3 class="text-sm font-semibold text-slate-900 hover:text-emerald-700">{{ job.title }}</h3>
                <p class="text-xs text-slate-500">
                  {{ job.day }} • {{ job.driver }}
                </p>
              </div>
              <span class="badge bg-slate-100 text-slate-700">
                {{ job.status }}
              </span>
            </RouterLink>
            <div
              v-else
              class="flex items-center justify-between gap-3"
            >
              <div>
                <h3 class="text-sm font-semibold text-slate-900">{{ job.title }}</h3>
                <p class="text-xs text-slate-500">
                  {{ job.day }} • {{ job.driver }}
                </p>
              </div>
              <span class="badge bg-slate-100 text-slate-700">
                {{ job.status }}
              </span>
            </div>
          </li>
        </ol>
      </section>
    </div>
    </div>

    <aside class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Use the planner</h2>
      <p class="text-sm text-slate-600">
        Reserve driver capacity, then publish jobs or assign to active runs without clashing schedules.
      </p>
      <RouterLink
        to="/jobs"
        class="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Go to jobs
      </RouterLink>
      <RouterLink
        to="/profile"
        class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Profile overview
      </RouterLink>
    </aside>
  </div>
</template>
