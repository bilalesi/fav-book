/**
 * Options for generating summaries
 */
export interface SummaryOptions {
  maxLength?: number;
  keywordCount?: number;
  tagCount?: number;
  temperature?: number;
}

/**
 * Result from summarization operation
 */
export interface SummaryResult {
  summary: string;
  keywords: string[];
  tags: string[];
  tokensUsed?: number;
}

/**
 * Service interface for AI-powered summarization
 */
export interface SummarizationService {
  /**
   * Generate a summary with keywords and tags from content
   */
  generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<SummaryResult>;

  /**
   * Extract keywords from content
   */
  extractKeywords(content: string, count?: number): Promise<string[]>;

  /**
   * Extract semantic tags from content
   */
  extractTags(content: string, count?: number): Promise<string[]>;
}

/**
 * Configuration for LM Studio client
 */
export interface LMStudioConfig {
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Error types for AI operations
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}
