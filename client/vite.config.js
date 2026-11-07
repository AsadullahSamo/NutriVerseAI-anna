import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "url"

// Builds the static bundle that Anna serves inside its sandboxed iframe.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url))
    },
    extensions: [".js", ".jsx", ".json"]
  },
  esbuild: { jsx: "automatic" },
  build: {
    outDir: "../bundle",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // The Anna SDK is served by the host at runtime, never bundled.
      external: [/^\/static\/anna-apps\//]
    }
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"]
  }
})
