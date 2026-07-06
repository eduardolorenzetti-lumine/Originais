import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/tasks/",
  plugins: [react()],
  build: {
    outDir: "dist/tasks",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
