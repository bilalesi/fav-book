import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import { useQueryClient } from "@tanstack/react-query";

interface RetryEnrichmentButtonProps {
  bookmarkId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function RetryEnrichmentButton({
  bookmarkId,
  variant = "outline",
  size = "sm",
  className,
}: RetryEnrichmentButtonProps) {
  const [retrying, setRetrying] = useState(false);
  const queryClient = useQueryClient();

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Call the retry enrichment endpoint
      await client.bookmarks.retryEnrichment({ id: bookmarkId });

      toast.success("Enrichment retry started", {
        description: "The bookmark will be processed again shortly.",
      });

      // Invalidate queries to refresh the bookmark data
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", "get", bookmarkId],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", "enrichment-status", bookmarkId],
      });
    } catch (error) {
      console.error("Failed to retry enrichment:", error);
      toast.error("Failed to retry enrichment", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRetry}
      disabled={retrying}
      className={className}
      aria-label="Retry enrichment"
    >
      {retrying ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Retrying...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Enrichment
        </>
      )}
    </Button>
  );
}
