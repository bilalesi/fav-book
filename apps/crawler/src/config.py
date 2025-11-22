"""Configuration management for the crawler service."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Ollama configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # Service configuration
    service_host: str = "0.0.0.0"
    service_port: int = 9080

    # Crawler configuration
    crawler_timeout: int = 30
    crawler_verbose: bool = False
    
    # LLM configuration
    llm_timeout: int = 60  # Max seconds for LLM analysis
    llm_max_retries: int = 2  # Number of retries on failure

    class Config:
        env_file = ".env"
        env_prefix = "CRAWLER_"


settings = Settings()
