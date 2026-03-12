"""Tests for the cache manager."""
import pytest
import json
import os
import tempfile
import time
from unittest.mock import patch, MagicMock

from app.services.cache import CacheManager
from app.models.schemas import DashboardSummary


def _make_cache(cache_dir: str, ttl: int = 60) -> CacheManager:
    """Create a CacheManager with patched settings."""
    mock_settings = MagicMock()
    mock_settings.cache_dir = cache_dir
    mock_settings.cache_ttl = ttl
    with patch("app.services.cache.get_settings", return_value=mock_settings):
        return CacheManager()


def _make_dashboard() -> DashboardSummary:
    """Create a minimal DashboardSummary for testing."""
    return DashboardSummary(
        total_repos=1,
        average_score=75.0,
        fully_compliant=1,
        needs_migration=0,
        version_distribution={"net10.0": 1},
        scan_results=[],
        last_scan_time="2025-01-01T00:00:00Z",
    )


@pytest.fixture
def cache_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def cache(cache_dir):
    return _make_cache(cache_dir, ttl=60)


class TestCacheManager:
    def test_save_and_load(self, cache):
        """Should save and load data correctly."""
        data = _make_dashboard()
        cache.save("save-test", data)
        loaded = cache.load("save-test")
        assert loaded is not None
        assert loaded.average_score == 75.0

    def test_load_missing(self, cache):
        """Should return None for missing keys."""
        result = cache.load("nonexistent")
        assert result is None

    def test_invalidate(self, cache):
        """Should remove cached data."""
        data = _make_dashboard()
        cache.save("inv-test", data)
        cache.invalidate("inv-test")
        assert cache.load("inv-test") is None

    def test_ttl_expiry(self, cache_dir):
        """Expired cache entries should return None."""
        cache = _make_cache(cache_dir, ttl=0)
        data = _make_dashboard()
        cache.save("expired-test", data)
        time.sleep(0.1)
        result = cache.load("expired-test")
        assert result is None

    def test_file_created(self, cache, cache_dir):
        """Cache should create JSON files."""
        data = _make_dashboard()
        cache.save("file-test", data)
        files = os.listdir(cache_dir)
        assert any("file_test" in f or "file-test" in f for f in files)

    def test_complex_dashboard(self, cache):
        """Should handle dashboard with version distribution."""
        data = _make_dashboard()
        data.version_distribution = {"net10.0": 3, "net8.0": 2}
        data.total_repos = 5
        cache.save("complex-test", data)
        loaded = cache.load("complex-test")
        assert loaded is not None
        assert loaded.total_repos == 5
        assert loaded.version_distribution["net10.0"] == 3
