import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/**/*.ts",
  sourcemap: true,
  dts: false,
  external: ["@prisma/client", "@prisma/adapter-pg", "pg", "dotenv"],
});
