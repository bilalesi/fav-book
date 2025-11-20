import {
  defineConfig,
  type BuildEnvironmentOptions,
  type UserConfig,
} from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";


export default defineConfig((props: UserConfig) => {
  const isTest = props.mode === "test" || process.env.VITEST === "true";

  return {
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      !isTest && tanstackStart(),
      viteReact(),
      // !isTest && alchemy(),
    ].filter(Boolean),
    ssr: {
      // Externalize all dependencies that should not be bundled for SSR
      external: [
        "@prisma/client",
        "@prisma/adapter-pg",
        "pg",
        // Externalize workspace packages to use their built dist files
        "@favy/db",
        "@favy/api",
      ],
    },
    optimizeDeps: {
      // Exclude server-only packages from client-side dependency optimization
      exclude: [
        "@prisma/client",
        "@favy/db",
        "@favy/api",
      ],
    },
    build: {
      // Optimize bundle size with code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code
            "react-vendor": ["react", "react-dom"],
            "tanstack-vendor": [
              "@tanstack/react-router",
              "@tanstack/react-query",
            ],
            "ui-vendor": ["lucide-react"],
          },
        },
      },
      minify: "esbuild" as BuildEnvironmentOptions["minify"],
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    test: {
      globals: true,
      environment: "happy-dom",
      setupFiles: ["./src/test/setup.tsx"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      env: {
        VITE_SERVER_URL: "http://localhost:3000",
        VITE_API_URL: "http://localhost:3000",
        RESEND_API_KEY: "re_test_key_123456789",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        BETTER_AUTH_SECRET: "test-secret-key-for-testing-only",
        BETTER_AUTH_URL: "http://localhost:3000",
        TWITTER_CLIENT_ID: "test-twitter-client-id",
        TWITTER_CLIENT_SECRET: "test-twitter-client-secret",
        LINKEDIN_CLIENT_ID: "test-linkedin-client-id",
        LINKEDIN_CLIENT_SECRET: "test-linkedin-client-secret",
      },
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "node_modules/",
          "src/test/",
          "**/*.d.ts",
          "**/*.config.*",
          "**/routeTree.gen.ts",
        ],
      },
    },
  };
});
