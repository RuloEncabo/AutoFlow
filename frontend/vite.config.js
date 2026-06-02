import react from "@vitejs/plugin-react";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function removeCloudflareRedirects() {
  return {
    name: "remove-cloudflare-redirects",
    closeBundle() {
      const redirectsPath = resolve(process.cwd(), "dist", "_redirects");
      if (existsSync(redirectsPath)) {
        rmSync(redirectsPath, { force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCloudflareRedirects()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes("use client")) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
          state: ["@reduxjs/toolkit", "react-redux", "@tanstack/react-query", "axios"],
        },
      },
    },
  },
});
