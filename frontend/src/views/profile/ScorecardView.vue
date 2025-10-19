<script setup>
import ProfileScorecard from './ProfileScorecard.vue';
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

onMounted(() => {
  if (auth.token && !auth.user) {
    auth.fetchMe().catch(() => null);
  }
});
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-900">Scorecard</h1>
    <ProfileScorecard />
  </div>
</template>
