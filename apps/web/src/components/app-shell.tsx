import { authClient } from "@/lib/auth-client";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  // Only show sidebar for authenticated users
  if (!session) {
    return (
      <main className="flex-1 overflow-auto" role="main">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto" role="main">
        {children}
      </main>
    </div>
  );
}
