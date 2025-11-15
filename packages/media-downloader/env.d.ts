declare module "bun" {
  interface Env {
    COBALT_API_URL?: string;
    COBALT_API_KEY?: string;
    COBALT_TIMEOUT?: string;
  }
}
