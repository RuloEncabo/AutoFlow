import { apiClient } from "./axiosClient.js";
import { downloadBlobResponse } from "./downloadUtils.js";

export async function listReceptions(params = {}) {
  const response = await apiClient.get("/receptions/", { params });
  return response.data;
}

export async function createReception(payload) {
  const response = await apiClient.post("/receptions/", payload);
  return response.data;
}

export async function updateReception(id, payload) {
  const response = await apiClient.patch(`/receptions/${id}/`, payload);
  return response.data;
}

export async function completeReception(id) {
  const response = await apiClient.post(`/receptions/${id}/complete/`);
  return response.data;
}

export async function downloadReceptionPdf(id, fallbackName = "recepcion.pdf") {
  const response = await apiClient.get(`/receptions/${id}/pdf/`, { responseType: "blob" });
  downloadBlobResponse(response, fallbackName);
}

export async function listReceptionDamages(params = {}) {
  const response = await apiClient.get("/receptions/damages/", { params });
  return response.data;
}

export async function createReceptionDamage(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === "photoFile") return;
    formData.append(key, value ?? "");
  });
  if (payload.photoFile) {
    formData.append("photo", payload.photoFile);
  }
  const response = await apiClient.post("/receptions/damages/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
