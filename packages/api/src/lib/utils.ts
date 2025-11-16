export function isEnrichmentEnabled(): boolean {
  return (
    process.env.ENABLE_AI_SUMMARIZATION === "true" ||
    process.env.ENABLE_MEDIA_DOWNLOAD === "true"
  );
}

// Helper function to check if media download is enabled
export function isMediaDownloadEnabled(): boolean {
  return process.env.ENABLE_MEDIA_DOWNLOAD === "true";
}
