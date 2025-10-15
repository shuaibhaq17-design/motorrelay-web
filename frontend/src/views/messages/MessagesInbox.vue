<script setup>
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const threads = ref([]);
const loading = ref(false);
const errorMessage = ref('');

async function loadMessages() {
  if (!auth.token) {
    errorMessage.value = 'Log in to view messages.';
    threads.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get('/messages');
    threads.value = Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error('Failed to load messages', error);
    errorMessage.value = 'Unable to load conversations. Showing placeholders.';
    threads.value = [
      { id: 'demo-convo', subject: 'Demo conversation', last_message: 'Welcome to the new inbox.', updated_at: new Date().toISOString() }
    ];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!auth.user && auth.token) {
    auth.fetchMe().finally(loadMessages);
  } else {
    loadMessages();
  }
});
</script>

<template>
  <div class="space-y-4">
    <header class="space-y-1">
      <h1 class="text-2xl font-bold text-slate-900">Messages</h1>
      <p class="text-sm text-slate-600">
        Chat with dealerships and drivers. Conversations sync via the Laravel API.
      </p>
    </header>

    <div v-if="loading" class="rounded-2xl border bg-white p-4 text-sm text-slate-600">
      Loading messages&hellip;
    </div>

    <div v-else class="space-y-3">
      <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

      <ol class="space-y-2">
        <li
          v-for="thread in threads"
          :key="thread.id"
          class="tile flex flex-col gap-1 p-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">
              {{ thread.subject || 'Conversation' }}
            </h2>
            <time class="text-xs text-slate-500">
              {{ thread.updated_at ? new Date(thread.updated_at).toLocaleString() : '—' }}
            </time>
          </div>
          <p class="text-sm text-slate-600">
            {{ thread.last_message || 'No messages yet.' }}
          </p>
        </li>
      </ol>
    </div>
  </div>
</template>
