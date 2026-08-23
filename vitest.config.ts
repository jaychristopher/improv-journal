import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
    /**
     * Well above the 5s default, because these are not unit tests.
     *
     * Almost every suite here loads and parses the whole content corpus — 279
     * markdown files — and vitest isolates modules per file, so each one pays
     * that cost again. Clean, the slowest sit at 2 to 3.4 seconds. Run
     * alongside anything else competing for CPU, several cross 5s and fail on
     * time rather than on truth: a build running in the same shell was enough
     * to take out two suites that pass in two seconds on their own.
     *
     * These guards are only worth having if a red run means something, so the
     * limit is set where it catches a hang and not a busy machine.
     */
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
