<script setup>
import { ref } from 'vue';

const weeks = ref([
  {
    id: 'week-1',
    label: 'This Week',
    jobs: [
      { id: 'planner-1', title: 'Deliver Jaguar XF', status: 'scheduled', day: 'Tue', driver: 'A. Smith' },
      { id: 'planner-2', title: 'Collect Kia Sportage', status: 'scheduled', day: 'Thu', driver: 'You' }
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
  <div class="space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">Planner</h1>
      <p class="text-sm text-slate-600">
        Organise upcoming runs by week. This view replaces the Supabase-driven planner.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <section
        v-for="week in weeks"
       :key="week.id"
        class="tile p-4"
      >
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">{{ week.label }}</h2>
          <span class="badge bg-emerald-100 text-emerald-700">{{ week.jobs.length }} jobs</span>
        </header>

        <ol class="space-y-2">
          <li
            v-for="job in week.jobs"
            :key="job.id"
            class="rounded-xl border border-slate-200 p-3"
          >
            <div class="flex items-center justify-between">
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
</template>
