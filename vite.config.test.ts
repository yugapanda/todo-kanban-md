import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    '__TEST_MODE__': true,
  },
  resolve: {
    alias: {
      "@tauri-apps/api/core": path.resolve(__dirname, "./tests/e2e/mocks/tauri-core.ts"),
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./tests/e2e/mocks/tauri-dialog.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "./tests/e2e/mocks/tauri-event.ts"),
      "@tauri-apps/plugin-opener": path.resolve(__dirname, "./tests/e2e/mocks/tauri-opener.ts"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});