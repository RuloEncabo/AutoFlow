import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../auth/authSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

