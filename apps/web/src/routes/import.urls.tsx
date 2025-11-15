import { getUser } from "@/functions/get-user";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import { useCollectionsList } from "@/hooks/use-collections";
import Loader from "@/components/loader";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/import/urls")({
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

interface ValidationResult {
  valid: string[];
  invalid: Array<{ url: string; error: string }>;
  empty: number;
}

interface ImportResult {
  successCount: number;
  duplicateCount: number;
  failureCount: number;
  total: number;
  errors?: Array<{ url: string; error: string }>;
}

interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

function RouteComponent() {
  const [urlText, setUrlText] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const { data: collections, isLoading: collectionsLoading } =
    useCollectionsList();

  // Client-side URL validation with inline feedback
  // Requirements: 2.1
  const validateUrls = (text: string): ValidationResult => {
    if (!text || text.trim().length === 0) {
      return { valid: [], invalid: [], empty: 0 };
    }

    const lines = text.split("\n").map((line) => line.trim());
    const emptyLines = lines.filter((line) => line.length === 0).length;
    const nonEmptyLines = lines.filter((line) => line.length > 0);

    const valid: string[] = [];
    const invalid: Array<{ url: string; error: string }> = [];

    for (const line of nonEmptyLines) {
      // Check for empty or whitespace-only URLs
      if (!line || line.trim().length === 0) {
        continue;
      }

      // Check for obviously invalid patterns
      if (line.includes(" ") && !line.startsWith("http")) {
        invalid.push({
          url: line,
          error: "URL contains spaces. Please check the format.",
        });
        continue;
      }

      // Check for dangerous protocols
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.startsWith("javascript:") ||
        lowerLine.startsWith("data:") ||
        lowerLine.startsWith("vbscript:") ||
        lowerLine.startsWith("file:")
      ) {
        invalid.push({
          url: line,
          error:
            "Dangerous protocol detected. Only HTTP and HTTPS are allowed.",
        });
        continue;
      }

      // Validate URL format
      try {
        const url = new URL(line);

        // Check protocol
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          invalid.push({
            url: line,
            error: "Only HTTP and HTTPS protocols are supported.",
          });
          continue;
        }

        // Check for valid hostname
        if (!url.hostname || url.hostname.length === 0) {
          invalid.push({
            url: line,
            error: "URL must have a valid domain name.",
          });
          continue;
        }

        // Check for localhost or IP addresses (optional warning)
        if (
          url.hostname === "localhost" ||
          url.hostname === "127.0.0.1" ||
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)
        ) {
          // Allow but could add a warning in the future
        }

        // URL is valid
        valid.push(line);
      } catch (error) {
        // Provide more specific error messages
        if (error instanceof TypeError) {
          invalid.push({
            url: line,
            error:
              "Invalid URL format. Make sure it starts with http:// or https://",
          });
        } else {
          invalid.push({
            url: line,
            error: "Invalid URL format.",
          });
        }
      }
    }

    return { valid, invalid, empty: emptyLines };
  };

  // Handle text change and validate
  const handleUrlTextChange = (text: string) => {
    setUrlText(text);
    if (text.trim()) {
      const result = validateUrls(text);
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  // Toggle collection selection
  const handleToggleCollection = (collectionId: string, checked: boolean) => {
    const newSelected = new Set(selectedCollections);
    if (checked) {
      newSelected.add(collectionId);
    } else {
      newSelected.delete(collectionId);
    }
    setSelectedCollections(newSelected);
  };

  // Handle import with progress tracking
  const handleImport = async () => {
    // Validate before submission (Requirement 2.1)
    if (!validation || validation.valid.length === 0) {
      toast.error("No valid URLs to import. Please check your URL list.");
      return;
    }

    // Check for maximum batch size
    if (validation.valid.length > 500) {
      toast.error(
        "Maximum 500 URLs allowed per batch. Please split your import into smaller batches."
      );
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setProgress({
      current: 0,
      total: validation.valid.length,
      percentage: 0,
      status: "Starting import...",
    });

    try {
      // Update progress to show processing
      setProgress({
        current: 0,
        total: validation.valid.length,
        percentage: 0,
        status: "Processing URLs...",
      });

      const result = await client.bookmarks.batchImportUrls({
        urls: validation.valid,
        collectionIds:
          selectedCollections.size > 0
            ? Array.from(selectedCollections)
            : undefined,
        skipDuplicates: true,
      });

      // Update progress to completion
      setProgress({
        current: validation.valid.length,
        total: validation.valid.length,
        percentage: 100,
        status: "Import complete",
      });

      setImportResult(result);

      if (result.successCount > 0) {
        toast.success(
          `Successfully imported ${result.successCount} URL${
            result.successCount === 1 ? "" : "s"
          }`
        );
      }

      if (result.duplicateCount > 0) {
        toast.info(
          `Skipped ${result.duplicateCount} duplicate URL${
            result.duplicateCount === 1 ? "" : "s"
          }`
        );
      }

      if (result.failureCount > 0) {
        toast.error(
          `Failed to import ${result.failureCount} URL${
            result.failureCount === 1 ? "" : "s"
          }. Check the error details below.`
        );
      }
    } catch (error) {
      // Display user-friendly error messages
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import URLs";

      if (errorMessage.includes("Rate limit")) {
        toast.error(errorMessage);
      } else if (errorMessage.includes("Maximum")) {
        toast.error(errorMessage);
      } else if (errorMessage.includes("collections")) {
        toast.error(
          "One or more selected collections could not be found. Please refresh and try again."
        );
      } else {
        toast.error(
          "Failed to import URLs. Please try again or contact support if the problem persists."
        );
      }

      setProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setUrlText("");
    setValidation(null);
    setImportResult(null);
    setProgress(null);
    setSelectedCollections(new Set());
    setShowErrors(false);
  };

  // Handle retry failed URLs
  const handleRetryFailed = () => {
    if (!importResult?.errors) return;

    const failedUrls = importResult.errors.map((e) => e.url).join("\n");
    setUrlText(failedUrls);
    handleUrlTextChange(failedUrls);
    setImportResult(null);
    setShowErrors(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import URLs</h1>
        <p className="text-muted-foreground">
          Batch import multiple URLs to your bookmarks. Enter one URL per line.
        </p>
      </div>

      <div className="space-y-6">
        {/* Progress Tracking Section */}
        {isImporting && progress && (
          <Card>
            <CardHeader>
              <CardTitle>Importing URLs</CardTitle>
              <CardDescription>
                Please wait while we process your URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {progress.status}
                    </span>
                    <span className="font-medium">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {progress.percentage.toFixed(0)}% complete
                  </p>
                </div>

                {/* Processing Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Processing...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Result Section */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
              <CardDescription>Summary of the import operation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md border bg-green-50 dark:bg-green-950/20 p-4">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Successfully Imported
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.successCount}
                    </p>
                  </div>
                  <div className="rounded-md border bg-yellow-50 dark:bg-yellow-950/20 p-4">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Duplicates Skipped
                    </p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {importResult.duplicateCount}
                    </p>
                  </div>
                  <div className="rounded-md border bg-red-50 dark:bg-red-950/20 p-4">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Failed
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {importResult.failureCount}
                    </p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Errors ({importResult.errors.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowErrors(!showErrors)}
                      >
                        {showErrors ? "Hide" : "Show"} Details
                      </Button>
                    </div>
                    {showErrors && (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {importResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className="rounded-md border bg-destructive/5 p-3"
                          >
                            <p className="text-xs font-medium text-destructive break-all">
                              {error.url}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {error.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleReset} className="flex-1">
                    Import More URLs
                  </Button>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleRetryFailed}
                      className="flex-1"
                    >
                      Retry Failed URLs
                    </Button>
                  )}
                  <Link to="/bookmarks">
                    <Button variant="outline">View Bookmarks</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* URL Input Section */}
        {!importResult && !isImporting && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Enter URLs</CardTitle>
                <CardDescription>
                  Paste your URLs below, one per line
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url-input">URLs</Label>
                    <Textarea
                      id="url-input"
                      placeholder="https://example.com&#10;https://another-example.com&#10;https://third-example.com"
                      value={urlText}
                      onChange={(e) => handleUrlTextChange(e.target.value)}
                      disabled={isImporting}
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>

                  {/* Validation Status */}
                  {validation && (
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {validation.valid.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          >
                            ✓ {validation.valid.length} valid
                          </Badge>
                        </div>
                      )}
                      {validation.invalid.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            ✗ {validation.invalid.length} invalid
                          </Badge>
                        </div>
                      )}
                      {validation.empty > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            {validation.empty} empty line
                            {validation.empty === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      )}
                      {validation.valid.length > 500 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            ⚠ Exceeds 500 URL limit
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invalid URLs */}
                  {validation && validation.invalid.length > 0 && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-destructive font-medium">
                          Invalid URLs ({validation.invalid.length})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          These URLs will not be imported
                        </p>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {validation.invalid.map((item, index) => (
                          <div
                            key={index}
                            className="text-xs bg-background/50 rounded p-2"
                          >
                            <span className="text-destructive/80 break-all font-mono">
                              {item.url}
                            </span>
                            <div className="text-muted-foreground mt-1">
                              ⚠ {item.error}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation warnings */}
                  {validation && validation.valid.length > 500 && (
                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3">
                      <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
                        ⚠ Too many URLs
                      </p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                        You have {validation.valid.length} valid URLs, but the
                        maximum is 500 per batch. Please split your import into
                        smaller batches.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Collection Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Assign to Collections (Optional)</CardTitle>
                <CardDescription>
                  Select collections to organize your imported URLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {collectionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : collections && collections.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          id={`collection-${collection.id}`}
                          checked={selectedCollections.has(collection.id)}
                          onCheckedChange={(checked) =>
                            handleToggleCollection(
                              collection.id,
                              checked === true
                            )
                          }
                          disabled={isImporting}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`collection-${collection.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {collection.name}
                          </Label>
                          {collection.description && (
                            <p className="text-xs text-muted-foreground">
                              {collection.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No collections found.</p>
                    <p className="text-sm mt-2">
                      You can still import URLs without assigning them to
                      collections.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={
                  !validation ||
                  validation.valid.length === 0 ||
                  validation.valid.length > 500 ||
                  isImporting
                }
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    <span>Importing...</span>
                  </>
                ) : (
                  `Import ${validation?.valid.length || 0} URL${
                    validation?.valid.length === 1 ? "" : "s"
                  }`
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isImporting}
              >
                Clear
              </Button>
            </div>
          </>
        )}

        {/* Instructions Section */}
        <Card>
          <CardHeader>
            <CardTitle>How to Import URLs</CardTitle>
            <CardDescription>
              Follow these steps to batch import your URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Paste your URLs in the text area above, one per line</li>
              <li>
                The system will automatically validate each URL and show you the
                count
              </li>
              <li>
                Optionally, select one or more collections to organize your
                bookmarks
              </li>
              <li>
                Click "Import" to start the process - duplicates will be
                automatically skipped
              </li>
              <li>Review the results and retry any failed URLs if needed</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
