import api from './api';

export async function fetchJobHighlights() {
  const { data } = await api.get('/jobs/highlights');
  return data;
}

export async function fetchJobs(params = {}) {
  const { data } = await api.get('/jobs', { params });
  return data;
}

export async function fetchJob(jobId) {
  const { data } = await api.get(`/jobs/${jobId}`);
  return data;
}

export async function mutateJob(jobId, action) {
  const { data } = await api.post(`/jobs/${jobId}/${action}`);
  return data;
}

export async function applyForJob(jobId, payload = {}) {
  const { data } = await api.post(`/jobs/${jobId}/applications`, payload);
  return data;
}

export async function fetchJobApplications(jobId) {
  const { data } = await api.get(`/jobs/${jobId}/applications`);
  return data;
}

export async function updateJobApplication(jobId, applicationId, payload) {
  const { data } = await api.patch(`/jobs/${jobId}/applications/${applicationId}`, payload);
  return data;
}

export async function fetchDriverOverview() {
  const { data } = await api.get('/driver/overview');
  return data;
}

function toFormData(payload = {}) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    formData.append(key, value);
  });
  return formData;
}

export async function fetchJobExpenses(jobId) {
  const { data } = await api.get(`/jobs/${jobId}/expenses`);
  return data;
}

export async function createJobExpense(jobId, payload) {
  const formData = toFormData(payload);
  const { data } = await api.post(`/jobs/${jobId}/expenses`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function updateJobExpense(jobId, expenseId, payload) {
  const formData = toFormData(payload);
  const { data } = await api.patch(`/jobs/${jobId}/expenses/${expenseId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function deleteJobExpense(jobId, expenseId) {
  await api.delete(`/jobs/${jobId}/expenses/${expenseId}`);
}

export async function reviewJobExpense(jobId, expenseId, payload) {
  const { data } = await api.post(`/jobs/${jobId}/expenses/${expenseId}/decision`, payload);
  return data;
}

export async function downloadExpenseReceipt(jobId, expenseId) {
  const response = await api.get(`/jobs/${jobId}/expenses/${expenseId}/receipt`, {
    responseType: 'blob'
  });
  return response;
}

export async function submitJobCompletion(jobId, payload) {
  const formData = toFormData(payload);
  const { data } = await api.post(`/jobs/${jobId}/complete`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function approveJobCompletion(jobId) {
  const { data } = await api.post(`/jobs/${jobId}/completion/approve`);
  return data;
}

export async function rejectJobCompletion(jobId, payload = {}) {
  const { data } = await api.post(`/jobs/${jobId}/completion/reject`, payload);
  return data;
}

export async function downloadDeliveryProof(jobId) {
  const response = await api.get(`/jobs/${jobId}/delivery-proof`, {
    responseType: 'blob'
  });
  return response;
}

export async function cancelJob(jobId, payload = {}) {
  const { data } = await api.post(`/jobs/${jobId}/cancel`, payload);
  return data;
}

export async function markJobDelivered(jobId) {
  const { data } = await api.post(`/jobs/${jobId}/delivered`);
  return data;
}

export async function sendJobInvoice(jobId) {
  const { data } = await api.post(`/jobs/${jobId}/invoice/send`);
  return data;
}

export async function updateJobLocation(jobId, payload) {
  const { data } = await api.post(`/jobs/${jobId}/location-update`, payload);
  return data;
}

export async function dealerCompleteJob(jobId, payload = {}) {
  const { data } = await api.post(`/jobs/${jobId}/dealer-complete`, payload);
  return data;
}
