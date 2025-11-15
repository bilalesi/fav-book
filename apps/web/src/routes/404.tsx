import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/404")({
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-6xl font-bold text-muted-foreground">
              404
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Button asChild variant="outline">
                <Link to="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
