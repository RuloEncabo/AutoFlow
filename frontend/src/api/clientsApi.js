import { apiClient } from "./axiosClient.js";

export async function listClients(params = {}) {
  const response = await apiClient.get("/clients/", { params });
  return response.data;
}

export async function createClient(payload) {
  const response = await apiClient.post("/clients/", payload);
  return response.data;
}

export async function updateClient(id, payload) {
  const response = await apiClient.patch(`/clients/${id}/`, payload);
  return response.data;
}

export async function deleteClient(id) {
  await apiClient.delete(`/clients/${id}/`);
}

