"""Backend configuration from environment variables."""

from pydantic_settings import BaseSettings


class BackendSettings(BaseSettings):
    """Settings loaded from environment variables (Railway dashboard)."""

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    encryption_key: str  # Fernet key for API key encryption
    allowed_origins: str = "http://localhost:3000"  # Comma-separated
    max_concurrent_jobs: int = 3
    max_generations_per_hour: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = BackendSettings()
