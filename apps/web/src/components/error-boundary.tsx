import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display fallback UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("Error caught by boundary:", error, errorInfo);

    // In production, you could send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try again or contact
                support if the problem persists.
              </p>
              {this.state.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error fallback for smaller components
 */
export function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
      <h3 className="font-semibold mb-1">Error Loading Content</h3>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={resetError} size="sm">
        Try Again
      </Button>
    </div>
  );
}
