import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { client } from "@/utils/orpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Info } from "lucide-react";

interface EnrichmentSettingsData {
  ENABLE_AI_SUMMARIZATION: boolean;
  ENABLE_MEDIA_DOWNLOAD: boolean;
  MAX_MEDIA_SIZE_MB: number;
}

export function EnrichmentSettings() {
  const queryClient = useQueryClient();

  // Fetch current feature flags
  const { data: flagsData, isLoading } = useQuery({
    queryKey: ["featureFlags"],
    queryFn: () => client.featureFlags.getFlags(),
  });

  // Check if user is admin
  const { data: adminData } = useQuery({
    queryKey: ["featureFlags", "isAdmin"],
    queryFn: () => client.featureFlags.isAdmin(),
  });

  // Local state for form
  const [settings, setSettings] = useState<EnrichmentSettingsData>({
    ENABLE_AI_SUMMARIZATION: true,
    ENABLE_MEDIA_DOWNLOAD: true,
    MAX_MEDIA_SIZE_MB: 500,
  });

  // Update local state when data loads
  useEffect(() => {
    if (flagsData?.flags) {
      setSettings({
        ENABLE_AI_SUMMARIZATION: flagsData.flags.ENABLE_AI_SUMMARIZATION,
        ENABLE_MEDIA_DOWNLOAD: flagsData.flags.ENABLE_MEDIA_DOWNLOAD,
        MAX_MEDIA_SIZE_MB: flagsData.flags.MAX_MEDIA_SIZE_MB,
      });
    }
  }, [flagsData]);

  // Mutation to update flags
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<EnrichmentSettingsData>) =>
      client.featureFlags.updateFlags(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
      toast.success("Enrichment settings updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update settings");
      console.error(error);
    },
  });

  const handleSave = () => {
    // Validate max media size
    if (settings.MAX_MEDIA_SIZE_MB <= 0) {
      toast.error("Max media size must be greater than 0");
      return;
    }
    if (settings.MAX_MEDIA_SIZE_MB > 5000) {
      toast.error("Max media size cannot exceed 5000 MB");
      return;
    }

    updateMutation.mutate(settings);
  };

  const hasChanges = () => {
    if (!flagsData?.flags) return false;
    return (
      settings.ENABLE_AI_SUMMARIZATION !==
        flagsData.flags.ENABLE_AI_SUMMARIZATION ||
      settings.ENABLE_MEDIA_DOWNLOAD !==
        flagsData.flags.ENABLE_MEDIA_DOWNLOAD ||
      settings.MAX_MEDIA_SIZE_MB !== flagsData.flags.MAX_MEDIA_SIZE_MB
    );
  };

  const isAdmin = adminData?.isAdmin ?? false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Enrichment</CardTitle>
          <CardDescription>
            Configure automatic content processing features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Enrichment</CardTitle>
        <CardDescription>
          Configure automatic content processing features for your bookmarks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAdmin && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              These settings are managed by your administrator. Contact them to
              request changes.
            </p>
          </div>
        )}

        {/* AI Summarization Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="ai-summarization" className="text-base font-medium">
              AI Summarization
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically generate summaries, extract keywords, and identify
              tags for your bookmarks using AI
            </p>
          </div>
          <Switch
            id="ai-summarization"
            checked={settings.ENABLE_AI_SUMMARIZATION}
            onCheckedChange={(checked: boolean) =>
              setSettings((s) => ({ ...s, ENABLE_AI_SUMMARIZATION: checked }))
            }
            disabled={!isAdmin || updateMutation.isPending}
          />
        </div>

        {/* Media Download Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="media-download" className="text-base font-medium">
              Media Download
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically download videos and audio from bookmarked content
              for offline access
            </p>
          </div>
          <Switch
            id="media-download"
            checked={settings.ENABLE_MEDIA_DOWNLOAD}
            onCheckedChange={(checked: boolean) =>
              setSettings((s) => ({ ...s, ENABLE_MEDIA_DOWNLOAD: checked }))
            }
            disabled={!isAdmin || updateMutation.isPending}
          />
        </div>

        {/* Max Media Size Input */}
        {settings.ENABLE_MEDIA_DOWNLOAD && (
          <div className="space-y-2 pl-0">
            <Label htmlFor="max-media-size" className="text-base font-medium">
              Maximum Media Size (MB)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Set the maximum file size for media downloads. Files larger than
              this will be skipped.
            </p>
            <Input
              id="max-media-size"
              type="number"
              min="1"
              max="5000"
              value={settings.MAX_MEDIA_SIZE_MB}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  MAX_MEDIA_SIZE_MB: Number(e.target.value),
                }))
              }
              disabled={!isAdmin || updateMutation.isPending}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Range: 1 - 5000 MB. Current: {settings.MAX_MEDIA_SIZE_MB} MB
            </p>
          </div>
        )}

        {/* Storage Usage Info */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Storage Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Current Storage Usage
              </p>
              <p className="text-sm font-medium">
                Coming soon - Storage tracking will be available in a future
                update
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Enriched Bookmarks
              </p>
              <p className="text-sm font-medium">
                Check your dashboard for enrichment statistics
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isAdmin && (
          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
            {hasChanges() && (
              <p className="text-xs text-muted-foreground mt-2">
                You have unsaved changes
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
