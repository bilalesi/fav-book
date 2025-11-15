import { Toaster } from "@/components/ui/sonner";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  ErrorComponent,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "../components/header";
import { AppShell } from "../components/app-shell";
import { ErrorBoundary } from "../components/error-boundary";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";

import type { orpc } from "@/utils/orpc";
export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Social Bookmarks Manager",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  errorComponent: ({ error }) => (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="grid h-svh grid-rows-[auto_1fr]">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <ErrorComponent error={error} />
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </div>
      </div>
    </div>
  ),
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <AppShell>
            <div className="flex flex-col h-full">
              <Header />
              <div id="main-content" className="flex-1 overflow-auto">
                <Outlet />
              </div>
            </div>
          </AppShell>
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}
