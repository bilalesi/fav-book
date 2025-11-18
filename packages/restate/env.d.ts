declare module "bun" {
  interface Env {
    // Restate Configuration
    RESTATE_INGRESS_URL?: string;
    RESTATE_ADMIN_URL?: string;
    RESTATE_SERVICE_PORT?: string;

    // Database
    DATABASE_URL?: string;

    // Feature Flags
    ENABLE_AI_SUMMARIZATION?: string;
    ENABLE_MEDIA_DOWNLOAD?: string;
    MAX_MEDIA_SIZE_MB?: string;

    // AI Service
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;

    // Storage
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    S3_BUCKET_NAME?: string;
  }
}
