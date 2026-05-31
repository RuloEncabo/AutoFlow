import { apiClient } from "./axiosClient.js";
import { downloadBlobResponse } from "./downloadUtils.js";

export async function listWorkOrders(params = {}) {
  const response = await apiClient.get("/work-orders/", { params });
  return response.data;
}

export async function createWorkOrder(payload) {
  const response = await apiClient.post("/work-orders/", payload);
  return response.data;
}

export async function updateWorkOrder(id, payload) {
  const response = await apiClient.patch(`/work-orders/${id}/`, payload);
  return response.data;
}

export async function deleteWorkOrder(id) {
  await apiClient.delete(`/work-orders/${id}/`);
}

export async function changeWorkOrderStatus(id, status, notes = "") {
  const response = await apiClient.post(`/work-orders/${id}/change-status/`, { status, notes });
  return response.data;
}

export async function listWorkOrderTasks(id) {
  const response = await apiClient.get(`/work-orders/${id}/tasks/`);
  return response.data;
}

export async function createWorkOrderTask(id, payload) {
  const response = await apiClient.post(`/work-orders/${id}/tasks/`, payload);
  return response.data;
}

export async function downloadWorkOrderPdf(id, fallbackName = "orden.pdf") {
  const response = await apiClient.get(`/work-orders/${id}/pdf/`, { responseType: "blob" });
  downloadBlobResponse(response, fallbackName);
}
