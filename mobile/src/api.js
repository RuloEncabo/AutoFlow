import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL_KEY = "autoflow.mobile.apiUrl";
const TOKEN_KEY = "autoflow.mobile.access";
const REFRESH_KEY = "autoflow.mobile.refresh";

export async function getApiUrl() {
  return (await AsyncStorage.getItem(API_URL_KEY)) || "https://autoflow-jl6p.onrender.com/api";
}

export async function setApiUrl(value) {
  await AsyncStorage.setItem(API_URL_KEY, value.replace(/\/$/, ""));
}

export async function saveTokens(tokens) {
  await AsyncStorage.setItem(TOKEN_KEY, tokens.access);
  await AsyncStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const apiUrl = await getApiUrl();
  const token = await getAccessToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || JSON.stringify(data) || "Error de conexion");
  }
  return data;
}

export async function login(email, password) {
  const data = await request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await saveTokens(data);
  return data;
}

export async function getMobileConfig() {
  return request("/mobile/config/");
}

export async function listClients() {
  return request("/clients/?page_size=200");
}

export async function listVehicles() {
  return request("/vehicles/?page_size=200");
}

export async function listReceptions() {
  return request("/receptions/?page_size=100");
}

export async function createReception(payload) {
  return request("/mobile/receptions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadReceptionDamage(payload) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key !== "photo" && value !== undefined && value !== null) form.append(key, String(value));
  });
  if (payload.photo) {
    form.append("photo", {
      uri: payload.photo.uri,
      type: payload.photo.mimeType || "image/jpeg",
      name: payload.photo.fileName || `damage-${Date.now()}.jpg`,
    });
  }
  return request("/mobile/reception-damages/", {
    method: "POST",
    body: form,
  });
}
