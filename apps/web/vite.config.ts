import { defineConfig, type BuildEnvironmentOptions, } from "vite";
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { devtools } from '@tanstack/devtools-vite';
import { nitro } from 'nitro/vite';
import tailwindcss from "@tailwindcss/vite";
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    plugins: [
      devtools(),
      nitro(),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ],
    ssr: {
      external: [
        "@prisma/client",
        "@prisma/adapter-pg",
        "pg",
        "@favy/db",
        "@favy/server",
      ],
    },
    optimizeDeps: {
      exclude: ["@prisma/client", "@favy/db"],
    },
    build: {
      // rollupOptions: {
      //   output: {
      //     manualChunks: {
      //       "react-vendor": ["react", "react-dom"],
      //       "tanstack-vendor": [
      //         "@tanstack/react-router",
      //         "@tanstack/react-query",
      //       ],
      //       "ui-vendor": ["lucide-react"],
      //     },
      //   },
      // },
      minify: "esbuild" as BuildEnvironmentOptions["minify"],
      chunkSizeWarningLimit: 1000,
    },
  };
});
