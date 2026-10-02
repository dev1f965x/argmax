import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// "localhost" resolves to ::1 only in the container, but VS Code port
// forwarding connects to 127.0.0.1.
const host = "127.0.0.1";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host },
  preview: { host },
});
