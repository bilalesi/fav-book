import axios, { type AxiosInstance, AxiosError } from "axios";
import type {
  CobaltConfig,
  CobaltApiRequest,
  CobaltApiResponse,
} from "./types";
import { MediaDownloadError, MediaErrorCodes } from "./types";

/**
 * Cobalt API client for media downloads
 */
export class CobaltClient {
  private client: AxiosInstance;
  private config: CobaltConfig;

  constructor(config?: Partial<CobaltConfig>) {
    this.config = {
      apiUrl:
        config?.apiUrl || process.env.COBALT_API_URL || "http://localhost:9000",
      apiKey: config?.apiKey || process.env.COBALT_API_KEY,
      timeout:
        config?.timeout ||
        Number.parseInt(process.env.COBALT_TIMEOUT || "30000"),
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Api-Key ${this.config.apiKey}`,
        }),
      },
    });

    // Add retry interceptor for transient failures
    this.setupRetryInterceptor();
  }

  /**
   * Setup axios interceptor for automatic retries on transient failures
   */
  private setupRetryInterceptor(): void {
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        const config = error.config;

        // Don't retry if no config or already retried max times
        if (!config || (config as any).__retryCount >= 2) {
          return Promise.reject(error);
        }

        // Initialize retry count
        (config as any).__retryCount = (config as any).__retryCount || 0;

        // Only retry on network errors or 5xx errors
        const shouldRetry =
          !error.response ||
          (error.response.status >= 500 && error.response.status < 600) ||
          error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT";

        if (shouldRetry) {
          (config as any).__retryCount += 1;

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, (config as any).__retryCount - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));

          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a request to Cobalt API
   */
  async request(payload: CobaltApiRequest): Promise<CobaltApiResponse> {
    try {
      const response = await this.client.post<CobaltApiResponse>(
        "/api/json",
        payload
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get media information without downloading
   */
  async getMediaInfo(url: string): Promise<CobaltApiResponse> {
    return this.request({
      url,
      videoQuality: "max",
      filenamePattern: "basic",
    });
  }

  /**
   * Download media file from URL
   */
  async downloadFile(downloadUrl: string, maxSize?: number): Promise<Buffer> {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        maxContentLength: maxSize || 500 * 1024 * 1024, // 500MB default
        timeout: this.config.timeout,
      });

      return Buffer.from(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED") {
          throw new MediaDownloadError(
            "File size exceeds maximum allowed size",
            MediaErrorCodes.FILE_TOO_LARGE,
            false
          );
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle and transform errors into MediaDownloadError
   */
  private handleError(error: unknown): MediaDownloadError {
    if (error instanceof MediaDownloadError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      // Network errors
      if (!error.response) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          return new MediaDownloadError(
            "Request timeout",
            MediaErrorCodes.TIMEOUT,
            true
          );
        }
        return new MediaDownloadError(
          "Network error",
          MediaErrorCodes.NETWORK_ERROR,
          true
        );
      }

      // HTTP errors
      const status = error.response.status;
      const data = error.response.data as CobaltApiResponse;

      if (status === 429) {
        return new MediaDownloadError(
          "Rate limit exceeded",
          MediaErrorCodes.RATE_LIMIT,
          true
        );
      }

      if (status >= 500) {
        return new MediaDownloadError(
          "Service unavailable",
          MediaErrorCodes.SERVICE_UNAVAILABLE,
          true
        );
      }

      if (status === 400 && data?.text) {
        return new MediaDownloadError(
          data.text,
          MediaErrorCodes.INVALID_URL,
          false
        );
      }

      return new MediaDownloadError(
        data?.text || "Download failed",
        MediaErrorCodes.DOWNLOAD_FAILED,
        false
      );
    }

    // Unknown error
    return new MediaDownloadError(
      error instanceof Error ? error.message : "Unknown error",
      MediaErrorCodes.DOWNLOAD_FAILED,
      false
    );
  }

  /**
   * Validate connection to Cobalt API
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Try to make a simple request to check if service is available
      await this.client.get("/");
      return true;
    } catch (error: unknown) {
      return false;
    }
  }
}

/**
 * Create a singleton instance of CobaltClient
 */
let clientInstance: CobaltClient | null = null;

export function getCobaltClient(config?: Partial<CobaltConfig>): CobaltClient {
  if (!clientInstance) {
    clientInstance = new CobaltClient(config);
  }
  return clientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetCobaltClient(): void {
  clientInstance = null;
}
