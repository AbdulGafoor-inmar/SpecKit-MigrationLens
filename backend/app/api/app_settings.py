"""Settings endpoint — view current configuration (read-only, no secrets)."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter()


class SettingsResponse(BaseModel):
    """Non-sensitive application settings exposed to the frontend."""
    ado_organization: str = ""
    ado_project: str = ""
    ado_base_url: str = ""
    backend_url: str = ""
    cors_origins: str = ""
    cache_dir: str = ""
    cache_ttl: int = 3600
    has_pat: bool = False


@router.get("/settings", response_model=SettingsResponse)
async def get_app_settings() -> SettingsResponse:
    """Return current application settings (secrets masked)."""
    settings = get_settings()
    return SettingsResponse(
        ado_organization=settings.ado_organization,
        ado_project=settings.ado_project,
        ado_base_url=settings.ado_base_url,
        backend_url=settings.backend_url,
        cors_origins=settings.cors_origins,
        cache_dir=settings.cache_dir,
        cache_ttl=settings.cache_ttl,
        has_pat=bool(settings.ado_pat),
    )
