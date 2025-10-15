<template>
  <div class="min-h-screen bg-slate-100">
    <header class="bg-white/90 backdrop-blur shadow-sm">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <RouterLink to="/" class="text-xl font-extrabold text-emerald-600">
          MotorRelay
        </RouterLink>

        <div class="hidden items-center gap-4 text-sm font-semibold text-slate-600 md:flex">
          <RouterLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            class="rounded-xl px-3 py-2 hover:bg-emerald-50 hover:text-emerald-700"
            active-class="bg-emerald-500 text-white hover:bg-emerald-500"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <RouterLink
          to="/login"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Login
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
const navLinks = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/messages', label: 'Messages' },
  { to: '/planner', label: 'Planner' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/profile', label: 'Profile' }
];
</script>
