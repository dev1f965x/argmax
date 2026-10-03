import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// "localhost" resolves to ::1 only in the container, but VS Code port
// forwarding connects to 127.0.0.1.
const host = "127.0.0.1";

/** Headers of the catch-all rule in public/_headers, the file the host serves. */
function productionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  let inCatchAll = false;
  for (const line of readFileSync("public/_headers", "utf8").split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inCatchAll = line.trim() === "/*";
      continue;
    }
    const separator = line.indexOf(":");
    if (inCatchAll && separator !== -1) {
      headers[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim();
    }
  }
  if (Object.keys(headers).length === 0) {
    throw new Error("public/_headers has no headers under the /* rule");
  }
  return headers;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host },
  // The dev server is left without the policy because Vite's hot reload injects inline scripts.
  preview: { host, headers: productionHeaders() },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
