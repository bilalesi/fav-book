import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Twitter,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/import/twitter")({
  component: TwitterImportPage,
});

interface CrawlOptions {
  directImport: boolean;
  enableSummarization: boolean;
}

interface ProgressUpdate {
  type: "progress" | "complete" | "error";
  bookmarksProcessed: number;
  currentBookmark?: {
    tweetId: string;
    text: string;
    author: string;
  };
  summarizationStatus?: string;
  error?: string;
  totalProcessed?: number;
  filePath?: string;
}

function TwitterImportPage() {
  const { data: session } = authClient.useSession();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);

  const [options, setOptions] = useState<CrawlOptions>({
    directImport: true,
    enableSummarization: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const startCrawl = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to import bookmarks");
      return;
    }

    setIsImporting(true);
    setError(null);
    setProgress(null);
    setDownloadPath(null);

    try {
      // Start the crawl
      const response = await fetch(
        `${import.meta.env.VITE_TWITOR_URL}/api/crawl/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: session.user.id,
            directImport: options.directImport,
            enableSummarization: options.enableSummarization,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to start crawl: ${response.statusText}`
        );
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      // Connect to SSE stream for progress updates
      const eventSource = new EventSource(
        `${import.meta.env.VITE_TWITOR_URL}/api/crawl/progress/${
          data.sessionId
        }`
      );

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const update: ProgressUpdate = JSON.parse(event.data);
          setProgress(update);

          if (update.type === "complete") {
            setIsImporting(false);
            if (update.filePath) {
              setDownloadPath(update.filePath);
            }
            toast.success(
              `Successfully imported ${update.totalProcessed} bookmarks!`
            );
            eventSource.close();
            eventSourceRef.current = null;
          } else if (update.type === "error") {
            setIsImporting(false);
            setError(update.error || "An error occurred during import");
            toast.error(update.error || "Import failed");
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (err) {
          console.error("Failed to parse SSE message:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection error:", err);
        setIsImporting(false);
        setError("Connection to server lost. Please try again.");
        toast.error("Connection lost");
        eventSource.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      setIsImporting(false);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start import";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopCrawl = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_TWITOR_URL}/api/crawl/stop/${sessionId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to stop crawl");
      }

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsImporting(false);
      toast.info("Import stopped");
    } catch (err) {
      toast.error("Failed to stop import");
    }
  };

  const downloadFile = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_TWITOR_URL}/api/crawl/download/${sessionId}`
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `twitter-bookmarks-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("File downloaded successfully");
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  const retryImport = () => {
    setError(null);
    setProgress(null);
    setDownloadPath(null);
    setSessionId(null);
    startCrawl();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Twitter className="w-8 h-8" />
          Twitter Bookmark Import
        </h1>
        <p className="text-muted-foreground">
          Import your Twitter bookmarks into your bookmark manager
        </p>
      </div>

      {/* Options Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
          <CardDescription>
            Configure how your Twitter bookmarks should be imported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Direct Import Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="direct-import"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Direct Import to Database
              </label>
              <p className="text-sm text-muted-foreground">
                Save bookmarks directly to your library. If disabled, bookmarks
                will be exported as a JSON file.
              </p>
            </div>
            <Switch
              id="direct-import"
              checked={options.directImport}
              onCheckedChange={(checked) =>
                setOptions({ ...options, directImport: checked })
              }
              disabled={isImporting}
            />
          </div>

          {/* Summarization Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="enable-summarization"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable AI Summarization
              </label>
              <p className="text-sm text-muted-foreground">
                Generate AI summaries for imported bookmarks. This may take
                longer but enriches your bookmarks with summaries.
              </p>
            </div>
            <Switch
              id="enable-summarization"
              checked={options.enableSummarization}
              onCheckedChange={(checked) =>
                setOptions({ ...options, enableSummarization: checked })
              }
              disabled={isImporting}
            />
          </div>

          {/* Start/Stop Button */}
          <div className="pt-4 border-t">
            {!isImporting ? (
              <Button
                onClick={startCrawl}
                className="w-full"
                size="lg"
                disabled={!session?.user?.id}
              >
                <Twitter className="w-5 h-5 mr-2" />
                Start Import
              </Button>
            ) : (
              <Button
                onClick={stopCrawl}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Stop Import
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {(isImporting || progress) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Import in Progress
                </>
              ) : progress?.type === "complete" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import Complete
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  Import Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Bookmarks Processed
                </p>
                <p className="text-2xl font-bold">
                  {progress?.bookmarksProcessed || 0}
                </p>
              </div>
              {options.enableSummarization && progress?.summarizationStatus && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Summarization Status
                  </p>
                  <Badge variant="secondary">
                    {progress.summarizationStatus}
                  </Badge>
                </div>
              )}
            </div>

            {/* Current Bookmark */}
            {progress?.currentBookmark && isImporting && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Currently Processing</p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    @{progress.currentBookmark.author}
                  </p>
                  <p className="text-sm">{progress.currentBookmark.text}</p>
                </div>
              </div>
            )}

            {/* Download Button */}
            {!isImporting && downloadPath && !options.directImport && (
              <div className="pt-4 border-t">
                <Button onClick={downloadFile} className="w-full" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Download Bookmarks JSON
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Card */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Import Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{error}</p>
            <Button onClick={retryImport} variant="outline" className="w-full">
              Retry Import
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      {!isImporting && !progress && !error && (
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This tool will fetch your Twitter bookmarks and import them into
              your bookmark manager.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                The import process will resume from where it left off if
                interrupted
              </li>
              <li>
                You can choose to import directly to your library or download as
                a JSON file
              </li>
              <li>
                AI summarization can be enabled to automatically generate
                summaries for your bookmarks
              </li>
              <li>
                Progress updates will be shown in real-time during the import
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
