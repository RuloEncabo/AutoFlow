import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { loginRequest, logoutRequest, meRequest } from "../api/authApi.js";

const storageKeys = {
  access: "autoflow.access",
  refresh: "autoflow.refresh",
  user: "autoflow.user",
};

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function persistSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(storageKeys.access, accessToken);
  if (refreshToken) localStorage.setItem(storageKeys.refresh, refreshToken);
  if (user) localStorage.setItem(storageKeys.user, JSON.stringify(user));
}

function clearPersistedSession() {
  localStorage.removeItem(storageKeys.access);
  localStorage.removeItem(storageKeys.refresh);
  localStorage.removeItem(storageKeys.user);
}

const initialState = {
  accessToken: localStorage.getItem(storageKeys.access),
  refreshToken: localStorage.getItem(storageKeys.refresh),
  user: readJson(storageKeys.user),
  status: "idle",
  error: null,
};

export const login = createAsyncThunk("auth/login", async (credentials) => {
  const tokens = await loginRequest(credentials);
  const user = await meRequest(tokens.access);
  return { tokens, user };
});

export const logout = createAsyncThunk("auth/logout", async (_, { getState }) => {
  const refresh = getState().auth.refreshToken;
  await logoutRequest(refresh);
});

export const fetchMe = createAsyncThunk("auth/me", async () => meRequest());

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokens(state, action) {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      persistSession({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      });
    },
    clearSession(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
      clearPersistedSession();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.tokens.access;
        state.refreshToken = action.payload.tokens.refresh;
        state.user = action.payload.user;
        persistSession({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          user: state.user,
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "error";
        state.error =
          action.error?.message || "No se pudo iniciar sesion. Verifica tus credenciales.";
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        persistSession({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          user: state.user,
        });
      })
      .addCase(logout.fulfilled, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.status = "idle";
        state.error = null;
        clearPersistedSession();
      })
      .addCase(logout.rejected, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.status = "idle";
        state.error = null;
        clearPersistedSession();
      });
  },
});

export const { clearSession, setTokens } = authSlice.actions;
export default authSlice.reducer;
