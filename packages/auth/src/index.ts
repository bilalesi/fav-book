import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@favy/db";
import { sendMagicLinkEmail } from "./email-service";

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
      // Optional: implement password reset email
      console.log(`Password reset for ${user.email}: ${url}`);
    },
  },

  // Social OAuth providers
  socialProviders: {
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      enabled: true,
    },
  },

  // Magic link authentication via email verification
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.info("========================================");
      console.info("BETTER-AUTH: sendVerificationEmail CALLED");
      console.info("========================================");
      console.info("User:", JSON.stringify(user, null, 2));
      console.info("URL:", url);
      console.info("========================================");

      const result = await sendMagicLinkEmail({
        to: user.email,
        magicLink: url,
      });

      console.info("========================================");
      console.info("BETTER-AUTH: Email send result");
      console.info("========================================");
      console.info("Result:", JSON.stringify(result, null, 2));
      console.info("========================================");

      if (!result.success) {
        throw new Error(`Failed to send magic link email: ${result.error}`);
      }
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },

  // Session management with secure cookies
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Advanced security settings
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
export { sendMagicLinkEmail } from "./email-service";
