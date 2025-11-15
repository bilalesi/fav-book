import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RetryEnrichmentButton } from "./retry-enrichment-button";

interface EnrichmentError {
  step: string;
  errorType: string;
  message: string;
  guidance: string;
  retryable: boolean;
  occurredAt: string;
  retryCount: number;
}

interface EnrichmentErrorDetailsProps {
  errors: EnrichmentError[];
  bookmarkId: string;
  processingStatus: string;
}

/**
 * Displays user-friendly error messages for enrichment failures
 * Shows actionable guidance and retry options
 */
export function EnrichmentErrorDetails({
  errors,
  bookmarkId,
  processingStatus,
}: EnrichmentErrorDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!errors || errors.length === 0) {
    return null;
  }

  // Get the most recent error for the main display
  const latestError = errors[0];
  const hasMultipleErrors = errors.length > 1;

  // Determine alert variant based on status
  const alertVariant =
    processingStatus === "FAILED" ? "destructive" : "default";

  return (
    <div className="space-y-3">
      <Alert variant={alertVariant}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>
            {processingStatus === "FAILED"
              ? "Enrichment Failed"
              : "Partial Enrichment"}
          </span>
          {hasMultipleErrors && (
            <Badge variant="outline" className="ml-2">
              {errors.length} errors
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          {/* Main error message */}
          <div>
            <p className="font-medium text-sm">{latestError.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Step: {formatStepName(latestError.step)}
            </p>
          </div>

          {/* Guidance */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">{latestError.guidance}</p>
          </div>

          {/* Retry button for retryable errors */}
          {latestError.retryable && processingStatus === "FAILED" && (
            <div className="flex items-center gap-2">
              <RetryEnrichmentButton
                bookmarkId={bookmarkId}
                variant="default"
                size="sm"
              />
              {latestError.retryCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Previously retried {latestError.retryCount} time
                  {latestError.retryCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Show all errors if multiple */}
          {hasMultipleErrors && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {isOpen ? "Hide" : "Show"} all errors
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {errors.slice(1).map((error, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md space-y-2 text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{error.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Step: {formatStepName(error.step)}
                        </p>
                      </div>
                      <Badge
                        variant={error.retryable ? "secondary" : "outline"}
                        className="ml-2"
                      >
                        {error.retryable ? "Retryable" : "Non-retryable"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {error.guidance}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Occurred: {new Date(error.occurredAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Formats workflow step names for display
 */
function formatStepName(step: string): string {
  const stepNames: Record<string, string> = {
    CONTENT_RETRIEVAL: "Content Retrieval",
    SUMMARIZATION: "AI Summarization",
    MEDIA_DETECTION: "Media Detection",
    MEDIA_DOWNLOAD: "Media Download",
    STORAGE_UPLOAD: "Storage Upload",
    DATABASE_UPDATE: "Database Update",
  };

  return stepNames[step] || step;
}
