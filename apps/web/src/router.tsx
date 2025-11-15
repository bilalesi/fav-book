import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import Loader from "./components/loader";
import "./index.css";
import { routeTree } from "./routeTree.gen";
import { QueryClientProvider } from "@tanstack/react-query";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Enable prefetching for better navigation performance
    defaultPreload: "intent", // Prefetch on hover/focus
    defaultPreloadDelay: 100, // Small delay to avoid unnecessary prefetches
    defaultPreloadStaleTime: 10000, // Cache prefetched data for 10 seconds
    context: { orpc, queryClient },
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
