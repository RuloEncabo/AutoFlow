import { apiClient } from "./axiosClient.js";

export async function getWorkshopProfile() {
  const response = await apiClient.get("/settings/workshop-profile/");
  return response.data;
}

export async function updateWorkshopProfile(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === "logoFile") return;
    formData.append(key, value ?? "");
  });
  if (payload.logoFile) {
    formData.append("logo", payload.logoFile);
  }

  const response = await apiClient.patch("/settings/workshop-profile/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function sendSettingsTestEmail(recipient) {
  const response = await apiClient.post("/settings/workshop-profile/test-email/", { recipient });
  return response.data;
}
