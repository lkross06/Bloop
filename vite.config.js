import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/test": "http://localhost:3000" //forward all requests to express back-end service
    }
  }
});