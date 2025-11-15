declare module "bun" {
  interface Env {
    LM_STUDIO_API_URL?: string;
    LM_STUDIO_MODEL?: string;
    LM_STUDIO_MAX_TOKENS?: string;
    LM_STUDIO_TEMPERATURE?: string;
  }
}
