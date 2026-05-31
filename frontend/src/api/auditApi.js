import { apiClient } from "./axiosClient.js";

export async function listAuditLogs(params = {}) {
  const response = await apiClient.get("/audit/logs/", { params });
  return response.data;
}

export async function listSessionAudits(params = {}) {
  const response = await apiClient.get("/audit/sessions/", { params });
  return response.data;
}
