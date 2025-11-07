import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });

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

await app.finalize();
