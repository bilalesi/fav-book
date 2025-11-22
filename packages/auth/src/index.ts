import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { prisma } from "@favy/db";

import { send_magic_link_email } from "./email-service";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : ["http://localhost:3001"],
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      console.log(`Password reset for ${user.email}: ${url}`);
    },
  },

  socialProviders: {
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      enabled: true,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      enabled: true,
    }
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.info("User:", JSON.stringify(user, null, 2));
      console.info("URL:", url);

      const result = await send_magic_link_email({
        to: user.email,
        magicLink: url,
      });

      console.info("Result:", JSON.stringify(result, null, 2));

      if (!result.success) {
        throw new Error(`Failed to send magic link email: ${result.error}`);
      }
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});

export type Auth = typeof auth;
export { send_magic_link_email as sendMagicLinkEmail } from "./email-service";
