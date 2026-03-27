"""JSON file-based cache manager with in-memory caching."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import structlog

from app.config import get_settings
from app.models.schemas import DashboardSummary

logger = structlog.get_logger()

# ── In-memory caches (process-level, survive across requests) ──────────────
_memory_cache: dict[str, tuple[float, float, Any]] = {}  # key -> (saved_at, ttl, value)
_MEMORY_TTL = 600  # 10 minutes default


def mem_get(key: str) -> Any | None:
    """Get a value from the in-memory cache if not expired."""
    entry = _memory_cache.get(key)
    if entry is None:
        return None
    saved_at, ttl, value = entry
    if time.time() - saved_at > ttl:
        del _memory_cache[key]
        return None
    return value


def mem_set(key: str, value: Any, ttl: int | None = None) -> None:
    """Store a value in the in-memory cache with optional custom TTL."""
    _memory_cache[key] = (time.time(), ttl or _MEMORY_TTL, value)


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
        # Also cache in memory for instant subsequent reads
        mem_set(f"dashboard:{organization}", data)
        logger.info("cache_saved", organization=organization, path=str(cache_path))

    def load(self, organization: str) -> DashboardSummary | None:
        """Load dashboard data from cache if not expired. Uses in-memory cache after first read."""
        # Check in-memory first (instant — no disk I/O or JSON parsing)
        mem_key = f"dashboard:{organization}"
        cached = mem_get(mem_key)
        if cached is not None:
            return cached

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
            # Store in memory for instant subsequent reads
            mem_set(mem_key, summary)
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
