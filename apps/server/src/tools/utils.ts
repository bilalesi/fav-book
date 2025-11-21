export function has_enrichment_enabled(): boolean {
	return (
		process.env.ENABLE_AI_SUMMARIZATION === "true" ||
		process.env.ENABLE_MEDIA_DOWNLOAD === "true"
	);
}

// Helper function to check if media download is enabled
export function is_media_download_enabled(): boolean {
	return process.env.ENABLE_MEDIA_DOWNLOAD === "true";
}
