import path from "node:path";
import type { PrismaConfig } from "prisma";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Type Safe env() helper
    // Does not replace the need for dotenv
    url: env("DATABASE_URL"),
  },
}) satisfies PrismaConfig;
