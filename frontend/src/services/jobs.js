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
