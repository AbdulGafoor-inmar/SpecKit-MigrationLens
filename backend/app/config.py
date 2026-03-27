"""Application configuration from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Azure DevOps
    ado_pat: str = ""
    ado_organization: str = ""
    ado_project: str = ""

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-35-turbo"
    azure_openai_api_version: str = "2025-01-01-preview"

    # Cache
    cache_dir: str = ".cache"
    cache_ttl: int = 86400  # 24 hours

    # Server
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}

    @property
    def ado_base_url(self) -> str:
        return f"https://dev.azure.com/{self.ado_organization}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
