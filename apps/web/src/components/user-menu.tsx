import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Link } from "@tanstack/react-router";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-8" />;
  }

  if (!session) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center h-8 w-8 bg-muted hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
          <span className="text-xs font-medium">
            {session.user.name?.charAt(0).toUpperCase() ||
              session.user.email?.charAt(0).toUpperCase()}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuItem>Teams</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <div className="flex items-center justify-between w-full">
            <span>Theme</span>
            <span className="text-xs text-muted-foreground">System</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  navigate({
                    to: "/",
                  });
                },
              },
            });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
