import { apiClient } from "./axiosClient.js";

export async function loginRequest(credentials) {
  const response = await apiClient.post("/auth/login/", credentials);
  return response.data;
}

export async function logoutRequest(refresh) {
  if (!refresh) return;
  await apiClient.post("/auth/logout/", { refresh });
}

export async function meRequest(accessToken) {
  const config = accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined;
  const response = await apiClient.get("/auth/me/", config);
  return response.data;
}

export async function requestPasswordReset(email) {
  const response = await apiClient.post("/auth/password-reset/request/", { email });
  return response.data;
}

export async function confirmPasswordReset(payload) {
  const response = await apiClient.post("/auth/password-reset/confirm/", payload);
  return response.data;
}
