import { getUser } from "@/functions/get-user";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function RouteComponent() {
  const { isLoading: statsLoading } = useDashboardStats();

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with dropdown */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select className="text-sm font-medium bg-transparent border-0 focus:outline-none focus:ring-0">
              <option>Overview</option>
              <option>Bookmarks</option>
              <option>Collections</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select className="text-sm bg-transparent border border-border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>All time</option>
            </select>
            <Button variant="ghost" size="icon">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Empty state or chart area */}
          {statsLoading ? (
            <div className="flex items-center justify-center h-96 border border-border bg-muted/20">
              <div className="text-center space-y-4">
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-4 w-96 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 border border-border bg-muted/20">
              <Bookmark className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">
                Start saving bookmarks
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                Install our browser extension to save posts from X and LinkedIn
                with one click, or import your existing bookmarks to get
                started.
              </p>
              <div className="flex gap-3">
                <Button
                  asChild
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <Link to="/import">Import bookmarks</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    Get extension
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Navigation arrows */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <Button variant="ghost" size="icon">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
