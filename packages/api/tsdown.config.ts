import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/**/*.ts",
  sourcemap: true,
  dts: false,
  treeshake: false,
  external: [
    "@favy/db",
    "@prisma/client",
    "@favy/trigger",
    "@favy/shared",
    "@favy/auth",
    "@orpc/server",
    "zod",
  ],
});
