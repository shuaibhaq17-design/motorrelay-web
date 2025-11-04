import api from './api';

export async function submitAccountChangeRequest(payload) {
  const { data } = await api.post('/account/change-requests', payload);
  return data;
}

export async function fetchAccountChangeRequests() {
  const { data } = await api.get('/account/change-requests');
  return data;
}

export async function fetchAdminAccountRequests(params = {}) {
  const { data } = await api.get('/admin/account-change-requests', { params });
  return data;
}

export async function decideAdminAccountRequest(id, payload) {
  const { data } = await api.post(`/admin/account-change-requests/${id}/decision`, payload);
  return data;
}
