"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Azure DevOps
    ado_pat: str = ""
    ado_organization: str = ""
    ado_project: str = ""

    # Cache
    cache_dir: str = ".cache"
    cache_ttl: int = 3600  # seconds

    # Server
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def ado_base_url(self) -> str:
        return f"https://dev.azure.com/{self.ado_organization}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
