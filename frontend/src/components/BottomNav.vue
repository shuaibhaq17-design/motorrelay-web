<script setup>
import { RouterLink, useRoute } from 'vue-router';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
});

const route = useRoute();

function isActive(item) {
  if (!item) return false;
  if (item.exact) {
    return route.path === item.to;
  }
  return route.path.startsWith(item.to);
}
</script>

<template>
  <nav
    v-if="items.length"
    class="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur md:hidden"
    role="navigation"
    aria-label="Primary navigation"
  >
    <div class="mx-auto flex max-w-6xl items-stretch justify-around px-2 py-2">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition"
        :class="isActive(item) ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'"
      >
        <svg
          v-if="item.icon === 'home'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 11.25 12 3l9 8.25M5.25 9.75V21h5.25v-5.25h3V21h5.25V9.75" />
        </svg>
        <svg
          v-else-if="item.icon === 'jobs'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 7.5V6A1.5 1.5 0 0 1 10.5 4.5h3A1.5 1.5 0 0 1 15 6v1.5M5.25 9h13.5a1.5 1.5 0 0 1 1.5 1.5v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V10.5a1.5 1.5 0 0 1 1.5-1.5Z" />
        </svg>
        <svg
          v-else-if="item.icon === 'membership'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.25h13.5v13.5H5.25z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5v9M7.5 12h9" />
        </svg>
        <svg
          v-else-if="item.icon === 'messages'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-4.219-7.594l3.219-1.156-.917 3.281A8.96 8.96 0 0 1 21 12Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12h.008v.008H7.5V12Zm4.5 0h.008v.008H12V12Zm4.5 0h.008v.008H16.5V12Z" />
        </svg>
        <svg
          v-else-if="item.icon === 'profile'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.875a8.25 8.25 0 0 1 15 0" />
        </svg>
        <svg
          v-else-if="item.icon === 'invoices'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 4.5h10.5A1.5 1.5 0 0 1 18.75 6v12a1.5 1.5 0 0 1-1.5 1.5H6.75A1.5 1.5 0 0 1 5.25 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9h6M9 12h6M9 15h3" />
        </svg>
        <svg
          v-else-if="item.icon === 'admin'"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21h7.5M4.5 9.75l3 6h9l3-6" />
        </svg>
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
