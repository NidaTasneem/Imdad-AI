import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    noDiscovery: true,
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "lucide-react"],
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
