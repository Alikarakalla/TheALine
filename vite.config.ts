import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One project, one deploy — mirrors the lebazone_web / Laravel public-root layout:
//   public/  -> web root (this build output; index.html + assets)
//   api/     -> PHP backend, served at /api (its own front controller)
//   static/  -> files copied verbatim into the build (e.g. the SPA .htaccess)
export default defineConfig({
  plugins: [react()],
  publicDir: "static",
  build: {
    outDir: "public",
    emptyOutDir: true,
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
    // In dev the storefront calls /api; forward it to the local PHP backend so
    // the API base is the same ("/api") in development and production.
    proxy: {
      "/api": {
        target: "http://localhost/lovebag/api",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
