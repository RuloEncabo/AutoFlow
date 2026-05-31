import { apiClient } from "./axiosClient.js";

export async function listOperators(params = {}) {
  const response = await apiClient.get("/operators/", { params });
  return response.data;
}

export async function createOperator(payload) {
  const response = await apiClient.post("/operators/", payload);
  return response.data;
}

export async function updateOperator(id, payload) {
  const response = await apiClient.patch(`/operators/${id}/`, payload);
  return response.data;
}

export async function deleteOperator(id) {
  await apiClient.delete(`/operators/${id}/`);
}
