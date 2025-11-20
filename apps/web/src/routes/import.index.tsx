import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import type { BulkImportInput, Platform } from "@favy/shared";

export const Route = createFileRoute("/import/")({
  component: RouteComponent,
});

interface ImportPreview {
  platform: Platform;
  bookmarkCount: number;
  sampleBookmarks: Array<{
    postId: string;
    content: string;
    author: string;
  }>;
}

function RouteComponent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failureCount: number;
    errors?: Array<{ index: number; error: string }>;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setSelectedFile(file);
    setPreview(null);
    setValidationError(null);
    setImportResult(null);
    setIsValidating(true);

    try {
      // Read file content
      const content = await file.text();
      let data: {
        platform?: string;
        bookmarks?: Array<{
          postId?: string;
          postUrl?: string;
          content?: string;
          author?: {
            name?: string;
            username?: string;
            profileUrl?: string;
          };
          timestamp?: string;
        }>;
      };

      try {
        data = JSON.parse(content);
      } catch (e) {
        throw new Error("Invalid JSON format");
      }

      // Validate structure
      if (!data.platform || !data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error(
          "Invalid file structure. Expected format: { platform, bookmarks: [] }"
        );
      }

      if (!["TWITTER", "LINKEDIN"].includes(data.platform)) {
        throw new Error('Invalid platform. Must be "TWITTER" or "LINKEDIN"');
      }

      if (data.bookmarks.length === 0) {
        throw new Error("No bookmarks found in file");
      }

      // Validate sample bookmarks
      const sampleSize = Math.min(3, data.bookmarks.length);
      for (let i = 0; i < sampleSize; i++) {
        const bookmark = data.bookmarks[i];
        if (
          !bookmark?.postId ||
          !bookmark?.postUrl ||
          !bookmark?.content ||
          !bookmark?.author?.name ||
          !bookmark?.author?.username ||
          !bookmark?.author?.profileUrl ||
          !bookmark?.timestamp
        ) {
          throw new Error(
            `Invalid bookmark at index ${i}. Missing required fields.`
          );
        }
      }

      // Create preview
      const sampleBookmarks = data.bookmarks.slice(0, 3).map((b) => ({
        postId: b.postId || "",
        content:
          (b.content || "").substring(0, 100) +
          ((b.content || "").length > 100 ? "..." : ""),
        author: `${b.author?.name || ""} (@${b.author?.username || ""})`,
      }));

      setPreview({
        platform: data.platform as Platform,
        bookmarkCount: data.bookmarks.length,
        sampleBookmarks,
      });
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Failed to validate file"
      );
      setSelectedFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !preview) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      // Read file content again
      const content = await selectedFile.text();
      const data: BulkImportInput = JSON.parse(content);

      // Call import API
      const result = await client.bookmarks.bulkImport(data);

      setImportResult(result);

      if (result.successCount > 0) {
        toast.success(
          `Successfully imported ${result.successCount} bookmark${
            result.successCount === 1 ? "" : "s"
          }`
        );
      }

      if (result.failureCount > 0) {
        toast.error(
          `Failed to import ${result.failureCount} bookmark${
            result.failureCount === 1 ? "" : "s"
          }`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import bookmarks"
      );
      setValidationError(
        error instanceof Error ? error.message : "Failed to import bookmarks"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setValidationError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Bookmarks</h1>
        <p className="text-muted-foreground">
          Upload a JSON file containing your bookmarks from X (Twitter) or
          LinkedIn to import them into your collection.
        </p>
      </div>

      <div className="space-y-6">
        {/* Import Options */}
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>
              Choose how you want to import your bookmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Link to="/import/twitter" className="block">
                <div className="border rounded-lg p-4 hover:bg-accent transition-colors h-full">
                  <h3 className="font-semibold mb-2">Twitter Bookmarks</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import bookmarks directly from Twitter with real-time
                    progress tracking
                  </p>
                  <Button variant="outline" size="sm">
                    Go to Twitter Import →
                  </Button>
                </div>
              </Link>
              <div className="border rounded-lg p-4 hover:bg-accent transition-colors">
                <h3 className="font-semibold mb-2">Social Media Bookmarks</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import bookmarks from X (Twitter) or LinkedIn using a JSON
                  file
                </p>
                <p className="text-xs text-muted-foreground">
                  Current page - scroll down to upload
                </p>
              </div>
              <Link to="/import/urls" className="block">
                <div className="border rounded-lg p-4 hover:bg-accent transition-colors h-full">
                  <h3 className="font-semibold mb-2">URL Bookmarks</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Batch import multiple URLs by pasting them directly
                  </p>
                  <Button variant="outline" size="sm">
                    Go to URL Import →
                  </Button>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload JSON File</CardTitle>
            <CardDescription>
              Select a JSON file exported from the crawler script
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Bookmarks File</Label>
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  disabled={isValidating || isImporting}
                />
              </div>

              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Validating file...</span>
                </div>
              )}

              {validationError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive font-medium">
                    Validation Error
                  </p>
                  <p className="text-sm text-destructive/80 mt-1">
                    {validationError}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {preview && !importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription>
                Review the bookmarks before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Platform
                    </p>
                    <p className="text-lg font-semibold">
                      {preview.platform === "TWITTER"
                        ? "X (Twitter)"
                        : "LinkedIn"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Bookmarks
                    </p>
                    <p className="text-lg font-semibold">
                      {preview.bookmarkCount}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Sample Bookmarks
                  </p>
                  <div className="space-y-2">
                    {preview.sampleBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.postId}
                        className="rounded-md border bg-muted/30 p-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {bookmark.author}
                        </p>
                        <p className="text-sm">{bookmark.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex-1"
                  >
                    {isImporting ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      `Import ${preview.bookmarkCount} Bookmark${
                        preview.bookmarkCount === 1 ? "" : "s"
                      }`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border bg-green-50 dark:bg-green-950/20 p-4">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Successfully Imported
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.successCount}
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
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Errors ({importResult.errors.length})
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {importResult.errors.slice(0, 10).map((error) => (
                        <div
                          key={error.index}
                          className="rounded-md border bg-destructive/5 p-2"
                        >
                          <p className="text-xs font-medium text-destructive">
                            Bookmark #{error.index + 1}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {error.error}
                          </p>
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ... and {importResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleReset} className="flex-1">
                    Import Another File
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/bookmarks")}
                  >
                    View Bookmarks
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions Section */}
        <Card>
          <CardHeader>
            <CardTitle>File Format</CardTitle>
            <CardDescription>
              Expected JSON structure for import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
              {`{
  "platform": "TWITTER" | "LINKEDIN",
  "exportDate": "2024-01-01T00:00:00Z",
  "bookmarks": [
    {
      "postId": "unique_post_id",
      "postUrl": "https://...",
      "content": "Post content text",
      "author": {
        "name": "Author Name",
        "username": "username",
        "profileUrl": "https://..."
      },
      "media": [
        {
          "type": "IMAGE" | "VIDEO" | "LINK",
          "url": "https://...",
          "thumbnailUrl": "https://..."
        }
      ],
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {}
    }
  ]
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
