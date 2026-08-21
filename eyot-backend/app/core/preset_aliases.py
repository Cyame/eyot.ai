"""Legacy 15d BaseClass slugs → v5 animal slugs.

Kept so a database that still has ``zhu-jin`` (铸金) can resolve
``coyote`` lookups, and so UI spawn of ``coyote`` hits the live row
after the seeder inserts the missing animal.
"""

from __future__ import annotations

LEGACY_PRESET_ALIASES: dict[str, str] = {
    "mi-shi": "fox",
    "an-xing": "beaver",
    "an-ying": "sparrow",
    "zhu-jin": "coyote",
    "jiu-ri": "lion",
}

ANCESTOR_SLUGS: tuple[str, ...] = ("fox", "beaver", "sparrow", "coyote", "lion")


def candidate_slugs(slug: str) -> tuple[str, ...]:
    """Return lookup order: requested slug, then 15d <-> animal aliases."""
    found: list[str] = [slug]
    alias = LEGACY_PRESET_ALIASES.get(slug)
    if alias is not None:
        found.append(alias)
    for legacy, animal in LEGACY_PRESET_ALIASES.items():
        if animal == slug:
            found.append(legacy)
    # unique, preserve order
    seen: set[str] = set()
    out: list[str] = []
    for item in found:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return tuple(out)
