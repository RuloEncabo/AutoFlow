import { apiClient } from "./axiosClient.js";
import { downloadBlobResponse } from "./downloadUtils.js";

export async function listEstimates(params = {}) {
  const response = await apiClient.get("/billing/estimates/", { params });
  return response.data;
}

export async function createEstimate(payload) {
  const response = await apiClient.post("/billing/estimates/", payload);
  return response.data;
}

export async function updateEstimate(id, payload) {
  const response = await apiClient.patch(`/billing/estimates/${id}/`, payload);
  return response.data;
}

export async function approveEstimate(id) {
  const response = await apiClient.post(`/billing/estimates/${id}/approve/`);
  return response.data;
}

export async function downloadEstimatePdf(id, fallbackName = "presupuesto.pdf") {
  const response = await apiClient.get(`/billing/estimates/${id}/pdf/`, { responseType: "blob" });
  downloadBlobResponse(response, fallbackName);
}

export async function listInvoices(params = {}) {
  const response = await apiClient.get("/billing/invoices/", { params });
  return response.data;
}

export async function createInvoice(payload) {
  const response = await apiClient.post("/billing/invoices/", payload);
  return response.data;
}

export async function downloadInvoicePdf(id, fallbackName = "factura.pdf") {
  const response = await apiClient.get(`/billing/invoices/${id}/pdf/`, { responseType: "blob" });
  downloadBlobResponse(response, fallbackName);
}

export async function createMercadoPagoPreference(id) {
  const response = await apiClient.post(`/billing/invoices/${id}/mercadopago/create-preference/`);
  return response.data;
}

export async function listPayments(params = {}) {
  const response = await apiClient.get("/billing/payments/", { params });
  return response.data;
}

export async function createPayment(payload) {
  const response = await apiClient.post("/billing/payments/", payload);
  return response.data;
}
