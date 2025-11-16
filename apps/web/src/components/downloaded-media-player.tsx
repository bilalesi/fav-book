import { useState } from "react";
import type { DownloadedMedia } from "@favy/shared";
import { Loader2, XCircle, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadedMediaPlayerProps {
  media: DownloadedMedia;
  className?: string;
}

export function DownloadedMediaPlayer({
  media,
  className,
}: DownloadedMediaPlayerProps) {
  const [error, setError] = useState(false);

  const formatFileSize = (bytes: bigint): string => {
    const mb = Number(bytes) / (1024 * 1024);
    if (mb < 1) {
      return `${(Number(bytes) / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Show status indicators for non-completed downloads
  if (media.downloadStatus === "PENDING") {
    return (
      <div className={cn("border rounded-lg p-4 bg-gray-50", className)}>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Clock className="h-5 w-5" />
          <div>
            <p className="font-medium">Media download queued</p>
            <p className="text-xs text-muted-foreground">
              Download will start shortly
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (media.downloadStatus === "DOWNLOADING") {
    return (
      <div className={cn("border rounded-lg p-4 bg-blue-50", className)}>
        <div className="flex items-center gap-3 text-sm text-blue-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <p className="font-medium">Downloading media...</p>
            <p className="text-xs text-blue-600">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (media.downloadStatus === "FAILED") {
    return (
      <div className={cn("border rounded-lg p-4 bg-red-50", className)}>
        <div className="flex items-center gap-3 text-sm text-red-700">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Media download failed</p>
            {media.errorMessage && (
              <p className="text-xs text-red-600">{media.errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render completed media
  if (media.downloadStatus === "COMPLETED" && media.storageUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4 text-green-600" />
            Downloaded Media
          </h4>
          <a
            href={media.storageUrl}
            download
            className="text-xs text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </div>

        {media.type === "VIDEO" && (
          <div className="rounded-lg overflow-hidden bg-black">
            {!error ? (
              <video
                controls
                className="w-full"
                onError={() => setError(true)}
                preload="metadata"
              >
                <source
                  src={media.storageUrl}
                  type={`video/${media.format || "mp4"}`}
                />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-100">
                <div className="text-center text-sm text-gray-600">
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Unable to load video</p>
                  <a
                    href={media.storageUrl}
                    className="text-primary hover:underline text-xs"
                    download
                  >
                    Download instead
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {media.type === "IMAGE" && (
          <div className="rounded-lg overflow-hidden">
            {!error ? (
              <img
                src={media.storageUrl}
                alt="Downloaded media"
                className="w-full h-auto"
                onError={() => setError(true)}
                loading="lazy"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-100">
                <div className="text-center text-sm text-gray-600">
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Unable to load image</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audio player - note: LINK type is not typically downloaded, but included for completeness */}
        {(media.type === "LINK" ||
          media.format === "mp3" ||
          media.format === "wav") && (
          <div className="rounded-lg border p-4 bg-gray-50">
            {!error ? (
              <audio
                controls
                className="w-full"
                onError={() => setError(true)}
                preload="metadata"
              >
                <source
                  src={media.storageUrl}
                  type={`audio/${media.format || "mp3"}`}
                />
                Your browser does not support the audio tag.
              </audio>
            ) : (
              <div className="text-center text-sm text-gray-600">
                <XCircle className="h-6 w-6 mx-auto mb-2" />
                <p>Unable to load audio</p>
              </div>
            )}
          </div>
        )}

        {/* Media metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {media.quality && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {media.quality}
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 rounded">
            {formatFileSize(media.fileSize)}
          </span>
          {media.duration && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {formatDuration(media.duration)}
            </span>
          )}
          {media.width && media.height && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {media.width}x{media.height}
            </span>
          )}
          {media.format && (
            <span className="px-2 py-1 bg-gray-100 rounded uppercase">
              {media.format}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
