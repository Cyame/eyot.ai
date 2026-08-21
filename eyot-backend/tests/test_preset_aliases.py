"""v5 animal slugs + leftover 15d aliases (coyote / zhu-jin)."""

from app.core.preset_aliases import (
    ANCESTOR_SLUGS,
    LEGACY_PRESET_ALIASES,
    candidate_slugs,
)
from app.core.preset_registry import registry


class _FakePreset:
    def __init__(self, slug: str) -> None:
        self.slug = slug


def test_candidate_slugs_resolves_both_directions() -> None:
    assert "coyote" in candidate_slugs("zhu-jin")
    assert "zhu-jin" in candidate_slugs("coyote")
    assert candidate_slugs("coyote")[0] == "coyote"


def test_five_ancestors_include_coyote() -> None:
    assert ANCESTOR_SLUGS == ("fox", "beaver", "sparrow", "coyote", "lion")
    assert LEGACY_PRESET_ALIASES["zhu-jin"] == "coyote"


def test_registry_get_resolves_legacy_zhu_jin_to_coyote() -> None:
    previous = registry._cache
    try:
        registry._cache = {"coyote": _FakePreset("coyote")}
        hit = registry.get("zhu-jin")
        assert hit is not None
        assert hit.slug == "coyote"
        assert registry.get("coyote") is hit
    finally:
        registry._cache = previous


def test_registry_get_resolves_coyote_when_only_legacy_row_exists() -> None:
    previous = registry._cache
    try:
        registry._cache = {"zhu-jin": _FakePreset("zhu-jin")}
        hit = registry.get("coyote")
        assert hit is not None
        assert hit.slug == "zhu-jin"
    finally:
        registry._cache = previous
