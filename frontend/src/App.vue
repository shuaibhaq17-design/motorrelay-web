<template>
  <div class="flex min-h-screen flex-col bg-slate-100">
    <header class="bg-white/90 backdrop-blur shadow-sm">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <div v-if="showBackButton" class="md:hidden">
            <BackButton />
          </div>
          <RouterLink to="/" class="flex items-center gap-3">
            <img
              src="@/assets/logo-icon.svg"
              alt="MotorRelay logo"
              class="h-12 w-12 rounded-xl shadow-sm"
            />
            <div class="flex flex-col leading-tight text-slate-900">
              <span class="font-extrabold tracking-wide uppercase">MotorRelay</span>
              <span class="text-xs font-semibold text-emerald-700 uppercase">Move Smarter</span>
            </div>
          </RouterLink>
        </div>

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

    <main :class="mainContainerClass">
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

    <BottomNav v-if="bottomNavItems.length" :items="bottomNavItems" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import BottomNav from '@/components/BottomNav.vue';
import BackButton from '@/components/BackButton.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const baseMainClasses = 'mx-auto flex-1 max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-8 lg:px-8';

const navLinks = [
  { to: '/', label: 'Home', exact: true, icon: 'home', showInBottomNav: true },
  { to: '/driver', label: 'Driver', roles: ['driver'] },
  { to: '/dealer', label: 'Dealer', roles: ['dealer'] },
  { to: '/invoices', label: 'Invoices', roles: ['driver', 'dealer', 'admin'] },
  { to: '/jobs', label: 'Jobs', icon: 'jobs', showInBottomNav: true },
{ to: '/membership', label: 'Membership' },
  { to: '/messages', label: 'Messages', icon: 'messages', showInBottomNav: true },
  { to: '/admin', label: 'Admin', roles: ['admin'], icon: 'admin', showInBottomNav: true },
  { to: '/planner', label: 'Planner', condition: () => auth.hasPlannerAccess },
  { to: '/profile', label: 'Profile', icon: 'profile', showInBottomNav: true }
];

const driverDealerAllowedNav = new Set(['/', '/jobs', '/messages', '/profile', '/dealer']);

function canShowLink(link, role) {
  if (link.roles && !link.roles.includes(role)) {
    return false;
  }
  if (typeof link.condition === 'function' && !link.condition()) {
    return false;
  }
  if (role === 'driver' || role === 'dealer') {
    return driverDealerAllowedNav.has(link.to);
  }
  return true;
}

const visibleNavLinks = computed(() => {
  if (!auth.isAuthenticated) return [];
  const role = auth.role || null;
  return navLinks.filter((link) => canShowLink(link, role));
});
const showLogin = computed(() => !auth.isAuthenticated);

const bottomNavItems = computed(() => {
  if (!auth.isAuthenticated) return [];
  const role = auth.role || null;

  return navLinks
    .filter((link) => link.showInBottomNav)
    .filter((link) => canShowLink(link, role))
    .map((link) => ({
      to: link.to,
      label: link.label,
      icon: link.icon,
      exact: link.exact ?? false
    }));
});

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

const mainContainerClass = computed(() => baseMainClasses);
const showBackButton = computed(() => route.path !== '/');

async function handleLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>
