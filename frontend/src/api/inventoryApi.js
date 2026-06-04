import { apiClient } from "./axiosClient.js";
import { downloadBlobResponse } from "./downloadUtils.js";

export async function listFamilies(params = {}) {
  const response = await apiClient.get("/inventory/families/", { params });
  return response.data;
}

export async function createFamily(payload) {
  const response = await apiClient.post("/inventory/families/", payload);
  return response.data;
}

export async function updateFamily(id, payload) {
  const response = await apiClient.patch(`/inventory/families/${id}/`, payload);
  return response.data;
}

export async function deleteFamily(id) {
  await apiClient.delete(`/inventory/families/${id}/`);
}

export async function listParts(params = {}) {
  const response = await apiClient.get("/inventory/parts/", { params });
  return response.data;
}

export async function createPart(payload) {
  const response = await apiClient.post("/inventory/parts/", payload);
  return response.data;
}

export async function updatePart(id, payload) {
  const response = await apiClient.patch(`/inventory/parts/${id}/`, payload);
  return response.data;
}

export async function deletePart(id) {
  await apiClient.delete(`/inventory/parts/${id}/`);
}

export async function lookupPartByScan(code) {
  const response = await apiClient.post("/inventory/parts/scan-lookup/", { code });
  return response.data;
}

export async function exportParts(withItems = false) {
  const response = await apiClient.get("/inventory/parts/export/", {
    params: { with_items: withItems ? 1 : 0 },
    responseType: "blob",
  });
  downloadBlobResponse(response, withItems ? "repuestos_con_items.xlsx" : "repuestos.xlsx");
}

export async function listMaterials(params = {}) {
  const response = await apiClient.get("/inventory/materials/", { params });
  return response.data;
}

export async function createMaterial(payload) {
  const response = await apiClient.post("/inventory/materials/", payload);
  return response.data;
}

export async function updateMaterial(id, payload) {
  const response = await apiClient.patch(`/inventory/materials/${id}/`, payload);
  return response.data;
}

export async function deleteMaterial(id) {
  await apiClient.delete(`/inventory/materials/${id}/`);
}

export async function lookupMaterialByScan(code) {
  const response = await apiClient.post("/inventory/materials/scan-lookup/", { code });
  return response.data;
}

export async function exportMaterials(withItems = false) {
  const response = await apiClient.get("/inventory/materials/export/", {
    params: { with_items: withItems ? 1 : 0 },
    responseType: "blob",
  });
  downloadBlobResponse(response, withItems ? "materiales_con_items.xlsx" : "materiales.xlsx");
}

export async function listWorkOrderParts(params = {}) {
  const response = await apiClient.get("/inventory/work-order-parts/", { params });
  return response.data;
}

export async function createWorkOrderPart(payload) {
  const response = await apiClient.post("/inventory/work-order-parts/", payload);
  return response.data;
}

export async function listWorkOrderMaterials(params = {}) {
  const response = await apiClient.get("/inventory/work-order-materials/", { params });
  return response.data;
}

export async function createWorkOrderMaterial(payload) {
  const response = await apiClient.post("/inventory/work-order-materials/", payload);
  return response.data;
}
