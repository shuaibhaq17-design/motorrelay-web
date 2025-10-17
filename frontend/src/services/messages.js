import api from './api';

export async function fetchThreads() {
  const { data } = await api.get('/messages');
  return data;
}

export async function fetchThreadMessages(threadId) {
  const { data } = await api.get(`/messages/threads/${threadId}`);
  return data;
}

export async function sendMessage(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'attachments' && Array.isArray(value)) {
      value.forEach((file) => formData.append('attachments[]', file));
      return;
    }
    formData.append(key, value);
  });

  const { data } = await api.post('/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function markMessageViewed(messageId) {
  const { data } = await api.post(`/messages/${messageId}/view`);
  return data;
}
