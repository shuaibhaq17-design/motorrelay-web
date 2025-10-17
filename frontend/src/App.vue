<template>
  <div class="min-h-screen bg-slate-100">
    <header class="bg-white/90 backdrop-blur shadow-sm">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <RouterLink to="/" class="text-xl font-extrabold text-emerald-600">
          MotorRelay
        </RouterLink>

        <div class="hidden items-center gap-4 text-sm font-semibold text-slate-600 md:flex">
          <RouterLink
            v-for="item in visibleNavLinks"
            :key="item.to"
            :to="item.to"
            :class="[
              baseLinkClass,
              isNavActive(item) ? activeLinkClass : inactiveLinkClass
            ]"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <RouterLink
          v-if="showLogin"
          to="/login"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Login
        </RouterLink>
        <button
          v-else
          type="button"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="handleLogout"
        >
          Logout
        </button>
      </nav>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav v-if="breadcrumbs.length" class="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.href ?? index">
          <RouterLink
            v-if="index !== breadcrumbs.length - 1 && crumb.href"
            :to="crumb.href"
            class="text-emerald-600 hover:underline"
          >
            {{ crumb.label }}
          </RouterLink>
          <span v-else class="font-medium text-slate-700">
            {{ crumb.label }}
          </span>
          <span v-if="index !== breadcrumbs.length - 1" aria-hidden="true">/</span>
        </template>
      </nav>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const navLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/driver', label: 'Driver', roles: ['driver'] },
  { to: '/jobs', label: 'Jobs' },
  { to: '/messages', label: 'Messages' },
  { to: '/planner', label: 'Planner', condition: () => auth.hasPlannerAccess },
  { to: '/invoices', label: 'Invoices', roles: ['dealer', 'admin'] },
  { to: '/profile', label: 'Profile' }
];

const visibleNavLinks = computed(() => {
  if (!auth.isAuthenticated) return [];
  const role = auth.role || null;
  return navLinks.filter((link) => {
    if (link.roles && !link.roles.includes(role)) {
      return false;
    }
    if (typeof link.condition === 'function' && !link.condition()) {
      return false;
    }
    return true;
  });
});
const showLogin = computed(() => !auth.isAuthenticated);

const baseLinkClass = 'rounded-xl px-3 py-2 transition';
const activeLinkClass = 'bg-emerald-500 text-white shadow-sm';
const inactiveLinkClass = 'hover:bg-emerald-50 hover:text-emerald-700';

function isNavActive(item) {
  if (item.exact) {
    return route.path === item.to;
  }
  return route.path.startsWith(item.to);
}

const breadcrumbs = computed(() => {
  const crumbs = [];

  route.matched.forEach((record) => {
    if (!record.meta || record.meta.breadcrumb === undefined) return;

    const value =
      typeof record.meta.breadcrumb === 'function'
        ? record.meta.breadcrumb(route)
        : record.meta.breadcrumb;

    const entries = Array.isArray(value) ? value : [{ label: value }];

    entries.forEach((entry) => {
      if (entry === null || entry === undefined || entry === false) return;

      const normalized =
        typeof entry === 'string' ? { label: entry } : { ...entry };

      if (!normalized.label) return;

      let href = null;
      if (normalized.to) {
        href = normalized.to;
      } else if (normalized.name) {
        href = router.resolve({ name: normalized.name, params: route.params }).href;
      } else if (record.name) {
        href = router.resolve({ name: record.name, params: route.params }).href;
      }

      crumbs.push({ label: normalized.label, href });
    });
  });

  if (crumbs.length) {
    crumbs[crumbs.length - 1].href = null;
  }

  return crumbs;
});

async function handleLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>
