import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001/a3chat-6eb35/us-east1",
        changeOrigin: true
      }
    }
  }
});
