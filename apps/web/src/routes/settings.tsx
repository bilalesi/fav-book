import { getUser } from "@/functions/get-user";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUserProfile,
  useUpdatePreferences,
  useUpdateProfile,
} from "@/hooks";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
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
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useUserProfile();
  const updatePreferences = useUpdatePreferences();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(session?.user.name || "");
  const [defaultView, setDefaultView] = useState<"card" | "table">(
    (profile?.preferences as any)?.defaultView || "card"
  );
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    (profile?.preferences as any)?.itemsPerPage || 20
  );

  const handleSaveProfile = () => {
    if (name !== session?.user.name) {
      updateProfile.mutate({ name });
    }
  };

  const handleSavePreferences = () => {
    updatePreferences.mutate({
      defaultView,
      itemsPerPage,
    });
  };

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Signed out successfully");
          navigate({ to: "/" });
        },
        onError: () => {
          toast.error("Failed to sign out");
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              View and manage your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={session?.user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label>Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending || name === session?.user.name}
            >
              {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
            <CardDescription>
              Overview of your bookmarks and collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Bookmarks</p>
                <p className="text-2xl font-bold">
                  {profile?._count?.bookmarkPosts || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Collections</p>
                <p className="text-2xl font-bold">
                  {profile?._count?.collections || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">
                  {profile?._count?.categories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your viewing experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultView">Default View</Label>
              <select
                id="defaultView"
                value={defaultView}
                onChange={(e) =>
                  setDefaultView(e.target.value as "card" | "table")
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="card">Card View</option>
                <option value="table">Table View</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Choose how bookmarks are displayed by default
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemsPerPage">Items Per Page</Label>
              <Input
                id="itemsPerPage"
                type="number"
                min="10"
                max="100"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of bookmarks to display per page (10-100)
              </p>
            </div>
            <Button
              onClick={handleSavePreferences}
              disabled={updatePreferences.isPending}
            >
              {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>Manage your account and session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sign Out</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Sign out of your account on this device
              </p>
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
