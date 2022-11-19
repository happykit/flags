import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/config.ts",
    "src/server.ts",
    "src/client.ts",
    "src/edge.ts",
    "src/evaluate.ts",
    "src/context.ts",
    "src/api-route.ts",
  ],
  format: ["esm", "cjs"],
  splitting: true,
  sourcemap: false,
  minify: true,
  clean: true,
  skipNodeModulesBundle: true,
  dts: true,
  external: [
    "node_modules",
    "@happykit/flags/config",
    "@happykit/flags/server",
    "@happykit/flags/client",
    "@happykit/flags/edge",
    "@happykit/flags/evaluate",
    "@happykit/flags/context",
    "@happykit/flags/api-route",
  ],
}));
