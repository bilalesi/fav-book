declare module "bun" {
  interface Env {
    TRIGGER_API_KEY: string;
    TRIGGER_API_URL: string;
    TRIGGER_SECRET_KEY?: string;
    TRIGGER_ENCRYPTION_KEY?: string;
  }
}
