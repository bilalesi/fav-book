import { createAuthClient } from "better-auth/react";
import { magicLinkClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
  plugins: [usernameClient(), magicLinkClient()],
});

export const { useSession, signIn, signOut } = authClient;
