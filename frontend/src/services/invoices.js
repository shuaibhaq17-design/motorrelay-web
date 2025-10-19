import api from './api';

export async function fetchInvoices() {
  const { data } = await api.get('/invoices');
  return data;
}

export async function fetchInvoice(invoiceId) {
  const { data } = await api.get(`/invoices/${invoiceId}`);
  return data;
}

export async function downloadInvoice(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}/download`, {
    responseType: 'blob'
  });
  return response;
}

export async function verifyInvoice(invoiceId) {
  const { data } = await api.get(`/invoices/${invoiceId}/verify`);
  return data;
}
