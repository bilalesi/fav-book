import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { config } from "dotenv";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? "./.env.production" : "./.env";

config({ path: envFile });

const app = await alchemy("my-better-t-app");

export const web = await TanStackStart("web", {
  bindings: {
    VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
  },
  dev: {
    command: "bun run dev",
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`API URL: ${process.env.VITE_SERVER_URL || "not set"}`);

await app.finalize();
