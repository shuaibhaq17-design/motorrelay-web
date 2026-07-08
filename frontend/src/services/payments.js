import api from './api';

export async function startDriverPayoutOnboarding() {
  const { data } = await api.post('/stripe/connect/onboard');
  return data;
}

export async function disconnectDriverPayoutAccount() {
  const { data } = await api.post('/stripe/connect/disconnect');
  return data;
}

export async function createJobCheckout(jobId) {
  const { data } = await api.post(`/jobs/${jobId}/payment/checkout`);
  return data;
}

export async function syncJobPayment(jobId, sessionId = null) {
  const { data } = await api.post(`/jobs/${jobId}/payment/sync`, {
    session_id: sessionId
  });
  return data;
}

export async function releaseDriverPayout(jobId) {
  const { data } = await api.post(`/jobs/${jobId}/payment/release-payout`);
  return data;
}
