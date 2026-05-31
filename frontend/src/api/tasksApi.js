import { apiClient } from "./axiosClient.js";

export async function listTasks(params = {}) {
  const response = await apiClient.get("/tasks/", { params });
  return response.data;
}

export async function createTask(payload) {
  const response = await apiClient.post("/tasks/", payload);
  return response.data;
}

export async function updateTask(id, payload) {
  const response = await apiClient.patch(`/tasks/${id}/`, payload);
  return response.data;
}

export async function deleteTask(id) {
  await apiClient.delete(`/tasks/${id}/`);
}
