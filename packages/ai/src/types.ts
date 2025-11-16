export interface SummaryOptions {
  maxLength?: number;
  keywordCount?: number;
  tagCount?: number;
  temperature?: number;
}

export interface SummaryResult {
  summary: string;
  keywords: string[];
  tags: Array<{ id: string; name: string }>;
  tokensUsed?: number;
}

export interface SummarizationService {
  generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<SummaryResult>;
  extractKeywords(content: string, count?: number): Promise<string[]>;
}

export interface LMStudioConfig {
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

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
