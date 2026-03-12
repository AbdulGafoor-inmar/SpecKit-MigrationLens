"""JSON file-based cache manager."""

from __future__ import annotations

import json
import time
from pathlib import Path

import structlog

from app.config import get_settings
from app.models.schemas import DashboardSummary

logger = structlog.get_logger()


class CacheManager:
    """Manages JSON file cache for dashboard scan results."""

    def __init__(self):
        settings = get_settings()
        self._cache_dir = Path(settings.cache_dir)
        self._ttl = settings.cache_ttl
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, organization: str) -> Path:
        safe_name = organization.replace("/", "_").replace("\\", "_")
        return self._cache_dir / f"dashboard_{safe_name}.json"

    def _meta_path(self, organization: str) -> Path:
        safe_name = organization.replace("/", "_").replace("\\", "_")
        return self._cache_dir / f"dashboard_{safe_name}.meta.json"

    def save(self, organization: str, data: DashboardSummary) -> None:
        """Save dashboard data to cache."""
        cache_path = self._cache_path(organization)
        meta_path = self._meta_path(organization)

        cache_path.write_text(data.model_dump_json(indent=2), encoding="utf-8")
        meta_path.write_text(
            json.dumps({"saved_at": time.time()}),
            encoding="utf-8",
        )
        logger.info("cache_saved", organization=organization, path=str(cache_path))

    def load(self, organization: str) -> DashboardSummary | None:
        """Load dashboard data from cache if not expired."""
        cache_path = self._cache_path(organization)
        meta_path = self._meta_path(organization)

        if not cache_path.exists() or not meta_path.exists():
            logger.debug("cache_miss", organization=organization)
            return None

        # Check TTL
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        saved_at = meta.get("saved_at", 0)
        if time.time() - saved_at > self._ttl:
            logger.info("cache_expired", organization=organization)
            return None

        try:
            raw = cache_path.read_text(encoding="utf-8")
            summary = DashboardSummary.model_validate_json(raw)
            logger.info("cache_hit", organization=organization)
            return summary
        except Exception as e:
            logger.error("cache_load_error", error=str(e))
            return None

    def invalidate(self, organization: str) -> None:
        """Remove cached data for an organization."""
        cache_path = self._cache_path(organization)
        meta_path = self._meta_path(organization)

        for p in (cache_path, meta_path):
            if p.exists():
                p.unlink()
        logger.info("cache_invalidated", organization=organization)
