import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkSummaryProps {
  summary?: string;
  keywords?: string[];
  tags?: string[];
  className?: string;
}

export function BookmarkSummary({
  summary,
  keywords,
  tags,
  className,
}: BookmarkSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (
    !summary &&
    (!keywords || keywords.length === 0) &&
    (!tags || tags.length === 0)
  ) {
    return null;
  }

  const handleCopy = async () => {
    const textToCopy = [
      summary && `Summary: ${summary}`,
      keywords && keywords.length > 0 && `Keywords: ${keywords.join(", ")}`,
      tags && tags.length > 0 && `Tags: ${tags.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className={cn("border rounded-lg p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className="text-blue-600">✨</span>
          AI Summary
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
            aria-label="Copy summary to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 px-2"
            aria-label={expanded ? "Collapse summary" : "Expand summary"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 animate-in fade-in-50 duration-200">
          {summary && (
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {keywords && keywords.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 block mb-2">
                Keywords
              </span>
              <div className="flex flex-wrap gap-1">
                {keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="text-xs bg-blue-50 border-blue-200 text-blue-700"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {tags && tags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 block mb-2">
                Tags
              </span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!expanded && (summary || (keywords && keywords.length > 0)) && (
        <p className="text-xs text-muted-foreground">
          Click to view {summary ? "summary" : ""}
          {summary && keywords && keywords.length > 0 ? ", " : ""}
          {keywords && keywords.length > 0 ? `${keywords.length} keywords` : ""}
          {tags && tags.length > 0 ? `, ${tags.length} tags` : ""}
        </p>
      )}
    </div>
  );
}
