/**
 * URL Normalization and Validation Utility
 *
 * Provides functions to normalize URLs, validate protocols, and sanitize against malicious URLs.
 */

/**
 * Normalize a URL for consistent comparison and storage
 *
 * Handles:
 * - Trailing slashes
 * - Query parameter ordering
 * - Case normalization for domain
 * - Protocol normalization
 *
 * @param url - The URL to normalize
 * @returns Normalized URL string
 *
 * Requirements: 2.1, 5.1
 */
export function normalize_url(url: string): string {
	try {
		const urlObj = new URL(url);

		// Normalize protocol to lowercase
		urlObj.protocol = urlObj.protocol.toLowerCase();

		// Normalize hostname to lowercase
		urlObj.hostname = urlObj.hostname.toLowerCase();

		// Remove default ports
		if (
			(urlObj.protocol === "http:" && urlObj.port === "80") ||
			(urlObj.protocol === "https:" && urlObj.port === "443")
		) {
			urlObj.port = "";
		}

		// Remove trailing slash from pathname (unless it's the root path)
		if (urlObj.pathname !== "/" && urlObj.pathname.endsWith("/")) {
			urlObj.pathname = urlObj.pathname.slice(0, -1);
		}

		// Sort query parameters for consistent comparison
		if (urlObj.search) {
			const params = new URLSearchParams(urlObj.search);
			const sortedParams = new URLSearchParams();

			// Sort parameters alphabetically
			Array.from(params.keys())
				.sort()
				.forEach((key) => {
					const values = params.getAll(key);
					values.forEach((value) => {
						sortedParams.append(key, value);
					});
				});

			urlObj.search = sortedParams.toString();
		}

		// Remove fragment (hash) for normalization
		urlObj.hash = "";

		return urlObj.toString();
	} catch (_error) {
		// If URL parsing fails, return original
		throw new Error(`Invalid URL format: ${url}`);
	}
}

/**
 * Validate that a URL uses http or https protocol only
 *
 * @param url - The URL to validate
 * @returns true if valid, false otherwise
 *
 * Requirements: 2.1
 */
export function is_valid_http_url(url: string): boolean {
	try {
		const urlObj = new URL(url);
		return urlObj.protocol === "http:" || urlObj.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Sanitize URL to prevent JavaScript and other malicious protocols
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or throws error if dangerous
 *
 * Requirements: 5.1
 */
export function sanitize_url(url: string): string {
	// Trim whitespace
	const trimmed = url.trim();

	// Check for dangerous protocols
	const dangerousProtocols = [
		"javascript:",
		"data:",
		"vbscript:",
		"file:",
		"about:",
	];

	const lowerUrl = trimmed.toLowerCase();
	for (const protocol of dangerousProtocols) {
		if (lowerUrl.startsWith(protocol)) {
			throw new Error(`Dangerous protocol detected: ${protocol}`);
		}
	}

	// Validate it's a proper http/https URL
	if (!is_valid_http_url(trimmed)) {
		throw new Error("URL must use http or https protocol");
	}

	return trimmed;
}

/**
 * Validate and normalize a URL in one step
 *
 * @param url - The URL to validate and normalize
 * @returns Normalized URL string
 * @throws Error if URL is invalid or dangerous
 *
 * Requirements: 2.1, 5.1
 */
export function validate_normalize_url(url: string): string {
	// First sanitize to check for dangerous protocols
	const sanitized = sanitize_url(url);

	// Then normalize for consistent storage
	return normalize_url(sanitized);
}

/**
 * Check if two URLs are equivalent after normalization
 *
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if URLs are equivalent
 */
export function are_urls_equivalent(url1: string, url2: string): boolean {
	try {
		const normalized1 = normalize_url(url1);
		const normalized2 = normalize_url(url2);
		return normalized1 === normalized2;
	} catch {
		return false;
	}
}
