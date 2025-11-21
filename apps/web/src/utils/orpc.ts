import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RouterClient } from "@orpc/server";
import type { TApiRouter } from "@favy/server";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data is fresh
      refetchOnReconnect: true, // Refetch when reconnecting
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry once for network errors
        return failureCount < 1;
      },
      retryDelay: 1000,
      onError: (error: any) => {
        const message = error?.message || "Failed to save changes";
        toast.error(message, {
          action: {
            label: "Dismiss",
            onClick: () => { },
          },
        });
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Only show toast for errors that aren't handled by components
      if (query.state.data === undefined) {
        const message = error?.message || "An error occurred";
        toast.error(message, {
          position: "bottom-right",
          action: {
            label: "Retry",
            onClick: () => {
              queryClient.invalidateQueries({ queryKey: query.queryKey });
            },
          },
        });
      }
    },
  }),
});

const link = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: RouterClient<TApiRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
