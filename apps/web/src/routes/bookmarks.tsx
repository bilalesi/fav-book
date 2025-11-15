import { getUser } from "@/functions/get-user";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/bookmarks")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }
    return { session };
  },
});

function RouteComponent() {
  return <Outlet />;
}
