import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home,
  Bookmark,
  FolderOpen,
  Upload,
  Settings,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { name: "Collections", href: "/collections", icon: FolderOpen },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-12 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-12 items-center justify-center border-b border-border">
        <Bookmark className="h-5 w-5" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex h-8 w-8 items-center justify-center transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={item.name}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        <button className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <span className="text-xs font-medium">OS</span>
        </button>
      </div>
    </div>
  );
}
