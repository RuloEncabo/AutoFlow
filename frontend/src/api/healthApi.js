import { apiClient } from "./axiosClient.js";

export async function getHealth() {
  const response = await apiClient.get("/health/");
  return response.data;
}

