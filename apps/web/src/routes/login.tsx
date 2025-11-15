import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Bookmark } from "lucide-react";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    // Redirect authenticated users to dashboard
    if (context.session) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [isLoadingOAuth, setIsLoadingOAuth] = useState<string | null>(null);
  const [isLoadingMagicLink, setIsLoadingMagicLink] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);

  const handleOAuthLogin = async (provider: "twitter" | "linkedin") => {
    setIsLoadingOAuth(provider);
    try {
      await authClient.signIn.social({
        provider: provider,
        callbackURL: window.location.origin + "/dashboard",
      });
    } catch (error) {
      toast.error(
        `Failed to sign in with ${provider === "twitter" ? "X" : "LinkedIn"}`
      );
      setIsLoadingOAuth(null);
    }
  };

  const handleMagicLinkSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoadingMagicLink(true);
    console.log("——", import.meta.env.VITE_SERVER_URL);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/send-verification-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            callbackURL: `${window.location.origin}/dashboard`,
          }),
          credentials: "include",
        }
      );
      console.log("response", await response.json());
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send magic link");
      }

      toast.success("Magic link sent! Check your email to sign in.");
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to send magic link. Please try again."
      );
    } finally {
      setIsLoadingMagicLink(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Nature image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-linear-to-br from-gray-400 via-gray-300 to-gray-200"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundBlendMode: "overlay",
          }}
        />
        <div className="absolute top-8 left-8">
          <Bookmark className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo for mobile */}
          <div className="lg:hidden mb-8">
            <Bookmark className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-medium">
              Welcome to Social Bookmarks
            </h1>
            <p className="text-sm text-muted-foreground">
              New here or coming back? Choose how you want to continue
            </p>
          </div>

          <div className="space-y-4">
            {/* Google Button */}
            <Button
              variant="outline"
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 border-0"
              onClick={() => handleOAuthLogin("twitter")}
              disabled={isLoadingOAuth !== null}
            >
              {isLoadingOAuth === "twitter" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Other options toggle */}
            <button
              onClick={() => setShowOtherOptions(!showOtherOptions)}
              className="w-full text-sm text-foreground hover:text-muted-foreground transition-colors flex items-center justify-center gap-2"
            >
              Other options
              <svg
                className={`h-4 w-4 transition-transform ${
                  showOtherOptions ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Expanded options */}
            {showOtherOptions && (
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full h-12 border-foreground"
                  onClick={() => handleOAuthLogin("twitter")}
                  disabled={isLoadingOAuth !== null}
                >
                  {isLoadingOAuth === "twitter" ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                  Continue with X
                </Button>

                {/* Email input */}
                <form onSubmit={handleMagicLinkSend} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoadingMagicLink}
                    className="h-12 border-border"
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
                    disabled={isLoadingMagicLink || !email}
                  >
                    {isLoadingMagicLink ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center">
            By signing in you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              terms of service
            </a>{" "}
            &{" "}
            <a href="#" className="underline hover:text-foreground">
              privacy policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
