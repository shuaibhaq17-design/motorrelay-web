import api from './api';

export async function fetchAdminDashboard() {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

