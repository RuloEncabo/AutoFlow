import { apiClient } from "./axiosClient.js";

export async function listVehicles(params = {}) {
  const response = await apiClient.get("/vehicles/", { params });
  return response.data;
}

export async function createVehicle(payload) {
  const response = await apiClient.post("/vehicles/", payload);
  return response.data;
}

export async function updateVehicle(id, payload) {
  const response = await apiClient.patch(`/vehicles/${id}/`, payload);
  return response.data;
}

export async function deleteVehicle(id) {
  await apiClient.delete(`/vehicles/${id}/`);
}

