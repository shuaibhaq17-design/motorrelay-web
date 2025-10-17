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
