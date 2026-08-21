import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/ollama": {
        target: "http://localhost:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, "")
      }
    }
  }
});
