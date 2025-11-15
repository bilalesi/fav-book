import UserMenu from "./user-menu";
import { SearchBar } from "./search-bar";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Bell } from "lucide-react";

export default function Header() {
  const { data: session } = authClient.useSession();

  if (!session) {
    return null;
  }

  return (
    <header className="border-b border-border bg-background" role="banner">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Search bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <SearchBar />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Upgrade plan
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
