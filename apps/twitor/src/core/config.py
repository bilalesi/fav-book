"""Configuration management for Twitor service."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Twitter API Credentials
    twitter_username: str = ""
    twitter_password: str = ""
    twitter_email: str = ""

    # Database Configuration
    database_url: str = "postgresql+asyncpg://localhost:5432/favbook"

    # API Configuration
    api_base_url: str = "http://localhost:3000"
    api_auth_token: str = ""

    # Service Configuration
    twitor_port: int = 8001
    twitor_host: str = "0.0.0.0"
    max_concurrent_crawls: int = 5
    batch_size: int = 100
    output_dir: str = "/tmp/twitor_exports"

    # Output Configuration
    output_dir: str = "/tmp/twitor_exports"

    # Valkey/Redis Configuration
    valkey_url: str = "redis://localhost:6379/0"
    valkey_max_connections: int = 10

    # Logging
    log_level: str = "INFO"
    debug: bool = False


# Global settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
