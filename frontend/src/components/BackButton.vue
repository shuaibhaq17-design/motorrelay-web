<template>
  <button
    type="button"
    class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
    aria-label="Go back"
    @click="handleBack"
  >
    <span aria-hidden="true">&lt;</span>
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function handleBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  router.push({ name: 'home' });
}
</script>
