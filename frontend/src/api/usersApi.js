import { apiClient } from "./axiosClient.js";

export async function listUsers(params = {}) {
  const response = await apiClient.get("/auth/users/", { params });
  return response.data;
}

export async function createUser(payload) {
  const response = await apiClient.post("/auth/users/", payload);
  return response.data;
}

export async function updateUser(id, payload) {
  const response = await apiClient.patch(`/auth/users/${id}/`, payload);
  return response.data;
}

export async function deleteUser(id) {
  await apiClient.delete(`/auth/users/${id}/`);
}
