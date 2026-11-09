import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const { LEXORA_DJANGO_PROXY: target } = loadEnv(
    mode,
    ".",
    "LEXORA_",
  );
  return {
    plugins: [react()],
    server: target
      ? {
          proxy: {
            "/api": { target, changeOrigin: true },
            "/ws": { target, ws: true, changeOrigin: true },
          },
        }
      : undefined,
  };
});
