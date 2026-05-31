import { apiClient } from "./axiosClient.js";

export async function listAppointments(params = {}) {
  const response = await apiClient.get("/appointments/", { params });
  return response.data;
}

export async function createAppointment(payload) {
  const response = await apiClient.post("/appointments/", payload);
  return response.data;
}

export async function updateAppointment(id, payload) {
  const response = await apiClient.patch(`/appointments/${id}/`, payload);
  return response.data;
}

export async function deleteAppointment(id) {
  await apiClient.delete(`/appointments/${id}/`);
}

export async function confirmAppointment(id) {
  const response = await apiClient.post(`/appointments/${id}/confirm/`);
  return response.data;
}

export async function cancelAppointment(id) {
  const response = await apiClient.post(`/appointments/${id}/cancel/`);
  return response.data;
}

export async function sendAppointmentEmail(id) {
  const response = await apiClient.post(`/appointments/${id}/send-email/`);
  return response.data;
}

export async function sendAppointmentWhatsapp(id) {
  const response = await apiClient.post(`/appointments/${id}/send-whatsapp/`);
  return response.data;
}

export async function sendAppointmentNotification(id, channels = ["email", "whatsapp"]) {
  const response = await apiClient.post(`/appointments/${id}/send-notification/`, { channels });
  return response.data;
}

export async function listAppointmentCommunications(id) {
  const response = await apiClient.get(`/appointments/${id}/communications/`);
  return response.data;
}

