import axios from "axios";

import { clearSession, setTokens } from "../auth/authSlice.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

export function configureAuthInterceptors(store) {
  apiClient.interceptors.request.use((config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;
      const refreshToken = store.getState().auth.refreshToken;

      if (status !== 401 || originalRequest?._retry || !refreshToken) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
        const response = await refreshPromise;
        refreshPromise = null;

        store.dispatch(
          setTokens({
            access: response.data.access,
            refresh: response.data.refresh || refreshToken,
          }),
        );

        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        store.dispatch(clearSession());
        return Promise.reject(refreshError);
      }
    },
  );
}

