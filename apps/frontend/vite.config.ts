/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node", // important: no DOM yet
    setupFiles: [], // we’ll add later if needed
    include: ["src/**/*.test.ts"],
  },
  // server: {
  //   port: 5173,
  // },
});
