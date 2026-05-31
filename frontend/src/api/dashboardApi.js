import { apiClient } from "./axiosClient.js";

export async function getOperationalDashboard() {
  const response = await apiClient.get("/dashboard/operational/");
  return response.data;
}

export async function getTvWorkOrders() {
  const response = await apiClient.get("/tv-dashboard/work-orders/");
  return response.data;
}
