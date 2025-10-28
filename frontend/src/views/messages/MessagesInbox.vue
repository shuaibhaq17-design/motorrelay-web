<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { fetchThreads, fetchThreadMessages, sendMessage, markMessageViewed } from '@/services/messages';
import { useAuthStore } from '@/stores/auth';
import TrackingCard from '@/components/messages/TrackingCard.vue';

const auth = useAuthStore();

const threads = ref([]);
const threadsLoading = ref(false);
const threadsError = ref('');

const selectedThreadId = ref(null);
const messages = ref([]);
const messageContainer = ref(null);
const messagesLoading = ref(false);
const messagesError = ref('');

const composer = reactive({
  body: '',
  attachments: [],
  sending: false,
  error: ''
});

const selectedThread = computed(() => threads.value.find((thread) => thread.id === selectedThreadId.value) ?? null);
const otherParticipants = computed(() =>
  (selectedThread.value?.participants ?? []).filter((participant) => participant.id !== auth.user?.id)
);

const preview = reactive({
  open: false,
  index: 0,
  items: []
});

function isImageAttachment(attachment) {
  return String(attachment?.mime_type || '').startsWith('image/');
}

function isLocationMessage(message) {
  return Boolean(message?.meta?.type === 'location_update' && message.meta?.location);
}

onMounted(async () => {
  if (!auth.user && auth.token) {
    await auth.fetchMe().catch(() => null);
  }
  await loadThreads();
});

onUnmounted(() => {
  if (preview.open) {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeydown);
  }
});

async function loadThreads() {
  threadsLoading.value = true;
  threadsError.value = '';
  try {
    const data = await fetchThreads();
    threads.value = Array.isArray(data?.data) ? data.data : [];
    if (!selectedThreadId.value && threads.value.length) {
      await selectThread(threads.value[0].id);
    } else if (selectedThreadId.value) {
      const active = threads.value.find((thread) => thread.id === selectedThreadId.value);
      if (!active && threads.value.length) {
        await selectThread(threads.value[0].id);
      }
    }
  } catch (error) {
    console.error('Failed to load conversations', error);
    threadsError.value = 'Unable to load conversations right now.';
    threads.value = [];
  } finally {
    threadsLoading.value = false;
  }
}

async function selectThread(threadId) {
  if (selectedThreadId.value === threadId) return;
  selectedThreadId.value = threadId;
  await loadMessages(threadId);
}

async function loadMessages(threadId = selectedThreadId.value) {
  if (!threadId) return;
  messagesLoading.value = true;
  messagesError.value = '';
  try {
    const data = await fetchThreadMessages(threadId);
    messages.value = Array.isArray(data?.data) ? data.data : [];
    await syncViewReceipts();
    scrollMessagesToBottom();
  } catch (error) {
    console.error('Failed to load messages', error);
    messagesError.value = 'Unable to load messages right now.';
    messages.value = [];
  } finally {
    messagesLoading.value = false;
  }
}

function handleAttachmentChange(event) {
  const files = Array.from(event.target.files ?? []);
  composer.attachments = files;
  event.target.value = '';
}

function openImagePreview(attachments, attachment) {
  const images = attachments.filter(isImageAttachment);
  const index = images.findIndex((img) => img.id === attachment.id);
  if (!images.length || index === -1) return;

  preview.items = images;
  preview.index = index;
  preview.open = true;
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  preview.open = false;
  preview.items = [];
  preview.index = 0;
  document.body.style.overflow = '';
}

function showNextImage() {
  if (!preview.items.length) return;
  preview.index = (preview.index + 1) % preview.items.length;
}

function showPreviousImage() {
  if (!preview.items.length) return;
  preview.index = (preview.index - 1 + preview.items.length) % preview.items.length;
}

function handleKeydown(event) {
  if (!preview.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closePreview();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    showNextImage();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    showPreviousImage();
  }
}

watch(
  () => preview.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeydown);
    } else {
      window.removeEventListener('keydown', handleKeydown);
    }
  }
);

function receiptFor(message, userId) {
  return message.receipts?.find((receipt) => receipt.user_id === userId) ?? null;
}

async function syncViewReceipts() {
  const myId = auth.user?.id;
  if (!myId) return;

  const unseen = messages.value.filter((message) => {
    const receipt = receiptFor(message, myId);
    return receipt && !receipt.viewed_at && message.user.id !== myId;
  });

  await Promise.all(
    unseen.map(async (message) => {
      try {
        const { viewed_at } = await markMessageViewed(message.id);
        const receipt = receiptFor(message, myId);
        if (receipt) {
          receipt.viewed_at = viewed_at;
        }
      } catch (error) {
        console.error('Failed to mark message as viewed', error);
      }
    })
  );
}

async function sendCurrentMessage() {
  if (!selectedThreadId.value || composer.sending) return;
  if (!composer.body && composer.attachments.length === 0) {
    composer.error = 'Add a message or an attachment before sending.';
    return;
  }

  composer.error = '';
  composer.sending = true;

  try {
    const payload = { thread_id: selectedThreadId.value };
    if (composer.body.trim()) {
      payload.body = composer.body;
    }
    if (composer.attachments.length) {
      payload.attachments = composer.attachments;
    }
    const response = await sendMessage(payload);
    const { thread, message } = response || {};
    if (message) {
      messages.value.push(message);
      scrollMessagesToBottom();
    }
    if (thread) {
      updateThreadSummary(thread);
    }
    composer.body = '';
    composer.attachments = [];
    await syncViewReceipts();
  } catch (error) {
    console.error('Failed to send message', error);
    composer.error = error.response?.data?.message || 'Unable to send your message.';
  } finally {
    composer.sending = false;
  }
}

watch(selectedThreadId, () => {
  composer.body = '';
  composer.attachments = [];
  composer.error = '';
});

function updateThreadSummary(summary) {
  if (!summary) return;
  const index = threads.value.findIndex((thread) => thread.id === summary.id);
  if (index === -1) {
    threads.value.unshift(summary);
    return;
  }
  const updated = { ...threads.value[index], ...summary };
  threads.value.splice(index, 1);
  threads.value.unshift(updated);
}

function scrollMessagesToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[320px,1fr]">
    <section class="space-y-3 rounded-2xl border bg-white p-4">
      <header>
        <h1 class="text-lg font-semibold text-slate-900">Conversations</h1>
        <p class="text-xs text-slate-500">Dealers and drivers can chat once a job is in progress.</p>
      </header>

      <div v-if="threadsLoading" class="rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
        Loading conversations...
      </div>

      <p v-else-if="threadsError" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        {{ threadsError }}
      </p>

      <ol v-else class="space-y-2">
        <li v-for="thread in threads" :key="thread.id">
          <button
            type="button"
            class="flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow"
            :class="selectedThreadId === thread.id ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'"
            @click="selectThread(thread.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-slate-900">
                {{ thread.subject || 'Conversation' }}
              </h2>
              <span v-if="thread.unread_count" class="badge bg-emerald-500 text-white">
                {{ thread.unread_count }}
              </span>
            </div>
            <p class="text-xs text-slate-500">
              {{ thread.updated_at ? new Date(thread.updated_at).toLocaleString() : '--' }}
            </p>
            <p class="line-clamp-2 text-xs text-slate-500">
              {{ thread.last_message || 'No messages yet.' }}
            </p>
          </button>
        </li>
      </ol>
    </section>

    <section class="space-y-4 rounded-2xl border bg-white p-4">
      <div v-if="!selectedThread">
        <h2 class="text-lg font-semibold text-slate-900">Select a conversation</h2>
        <p class="text-sm text-slate-600">Choose a thread to review messages and send updates.</p>
      </div>

      <template v-else>
        <header class="space-y-1 border-b pb-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">
                {{ selectedThread.subject || 'Conversation' }}
              </h2>
              <p class="text-xs text-slate-500">
                Participants:
                <span v-for="(participant, index) in selectedThread.participants" :key="participant.id">
                  {{ participant.name }}<span v-if="index < selectedThread.participants.length - 1">, </span>
                </span>
              </p>
            </div>
            <span v-if="selectedThread.job_id" class="badge bg-slate-100 text-slate-700">
              Job #{{ selectedThread.job_id }}
            </span>
          </div>
        </header>

        <div v-if="messagesLoading" class="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          Loading messages...
        </div>

        <div
          v-else-if="messagesError"
          class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
        >
          {{ messagesError }}
        </div>

        <div
          v-else
          ref="messageContainer"
          class="flex h-[420px] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <p v-if="!messages.length" class="text-sm text-slate-600">
            No messages yet. Start the conversation below.
          </p>

          <article
            v-for="message in messages"
            :key="message.id"
            class="flex w-full flex-col gap-2"
            :class="isLocationMessage(message) ? 'items-stretch' : message.user.id === auth.user?.id ? 'items-end' : 'items-start'"
          >
            <TrackingCard
              v-if="isLocationMessage(message)"
              :location="message.meta.location"
              :destination="message.meta.destination"
              :driver="message.meta.driver"
              :eta-minutes="message.meta.eta_minutes ?? null"
              :recorded-at="message.meta.location?.recorded_at ?? message.created_at"
            />
            <div
              v-else
              class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm"
              :class="message.user.id === auth.user?.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800'"
            >
              <p v-if="message.body">{{ message.body }}</p>

              <div v-if="message.attachments?.length" class="mt-2 flex flex-wrap gap-2">
                <template v-for="attachment in message.attachments" :key="attachment.id">
                  <button
                    v-if="isImageAttachment(attachment)"
                    type="button"
                    class="overflow-hidden rounded-xl border border-white/40 bg-white/10"
                    @click="openImagePreview(message.attachments, attachment)"
                  >
                    <img
                      :src="attachment.url"
                      :alt="attachment.original_name"
                      class="h-24 w-24 object-cover"
                      loading="lazy"
                    />
                  </button>
                  <a
                    v-else
                    :href="attachment.url"
                    target="_blank"
                    class="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white underline-offset-2 hover:underline"
                  >
                    {{ attachment.original_name }}
                  </a>
                </template>
              </div>
            </div>
            <div
              class="flex items-center gap-2 text-[11px] text-slate-500"
              :class="isLocationMessage(message) ? 'self-start' : ''"
            >
              <span>{{ message.user.name }}</span>
              <span>-</span>
              <time>{{ new Date(message.created_at).toLocaleString() }}</time>
              <template v-if="message.user.id === auth.user?.id">
                <span v-if="otherParticipants.some((p) => {
                  const receipt = receiptFor(message, p.id);
                  return receipt?.viewed_at;
                })">
                  Viewed
                </span>
                <span v-else>Delivered</span>
              </template>
            </div>
          </article>
        </div>

        <form class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" @submit.prevent="sendCurrentMessage">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="message-body">
            Message
          </label>
          <textarea
            id="message-body"
            v-model="composer.body"
            rows="3"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Write your update..."
          />

          <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <label class="flex items-center gap-2">
              <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" class="hidden" @change="handleAttachmentChange" />
              <span class="rounded-xl border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100">
                Attach files
              </span>
            </label>
            <span v-if="composer.attachments.length">{{ composer.attachments.length }} file(s) ready</span>
          </div>

          <p v-if="composer.error" class="text-sm text-amber-600">
            {{ composer.error }}
          </p>

          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="composer.sending"
            >
              <span v-if="composer.sending">Sending...</span>
              <span v-else>Send</span>
            </button>
          </div>
        </form>
      </template>
    </section>

    <div
      v-if="preview.open && preview.items.length"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700 shadow hover:bg-white"
        @click="closePreview"
      >
        Close
      </button>

      <button
        v-if="preview.items.length > 1"
        type="button"
        class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-white"
        @click="showPreviousImage"
      >
        Prev
      </button>

      <figure class="flex max-h-[80vh] w-full max-w-4xl flex-col items-center gap-3">
        <img
          :src="preview.items[preview.index].url"
          :alt="preview.items[preview.index].original_name"
          class="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
        />
        <figcaption class="text-sm text-white">
          {{ preview.items[preview.index].original_name }} ({{ preview.index + 1 }} / {{ preview.items.length }})
        </figcaption>
      </figure>

      <button
        v-if="preview.items.length > 1"
        type="button"
        class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-white"
        @click="showNextImage"
      >
        Next
      </button>
    </div>
  </div>
</template>
