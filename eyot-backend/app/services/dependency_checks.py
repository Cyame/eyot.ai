"""Extensible dependency-health checks used by ``GET /api/v1/system/dependencies``.

A check is a named async callable returning :class:`CheckResult`. New
middleware (Redis, MQ, object storage, …) is added by registering one more
item — the HTTP endpoint, TTL cache, and portal banner stay unchanged.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Final

from sqlalchemy import text

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS: Final[float] = 8.0
DATABASE_CHECK_TIMEOUT_SECONDS: Final[float] = 3.0
KUBERNETES_CHECK_TIMEOUT_SECONDS: Final[float] = 5.0

Checker = Callable[[], Awaitable["CheckResult"]]


@dataclass(frozen=True, slots=True)
class CheckResult:
    """Outcome of a single dependency probe."""

    ok: bool
    detail: str | None = None


@dataclass(frozen=True, slots=True)
class RegisteredCheck:
    """One named probe in the registry."""

    name: str
    checker: Checker
    timeout_seconds: float


@dataclass(frozen=True, slots=True)
class DependencyStatus:
    """Serialized per-dependency row in the HTTP response."""

    name: str
    ok: bool
    detail: str | None = None

    def as_dict(self) -> dict[str, str | bool | None]:
        return {"name": self.name, "ok": self.ok, "detail": self.detail}


class DependencyCheckRegistry:
    """Ordered registry of named dependency probes.

    Duplicate names are rejected so a later middleware cannot silently
    overwrite an existing check.
    """

    def __init__(self) -> None:
        self._items: list[RegisteredCheck] = []

    def register(
        self,
        name: str,
        checker: Checker,
        *,
        timeout_seconds: float,
    ) -> None:
        if any(item.name == name for item in self._items):
            raise ValueError(f"duplicate dependency check: {name}")
        self._items.append(
            RegisteredCheck(name=name, checker=checker, timeout_seconds=timeout_seconds)
        )

    @property
    def items(self) -> Sequence[RegisteredCheck]:
        return tuple(self._items)

    async def run_all(self) -> list[DependencyStatus]:
        """Run every registered check concurrently; isolate per-item failures."""
        return list(await asyncio.gather(*[self._run_one(item) for item in self._items]))

    async def _run_one(self, item: RegisteredCheck) -> DependencyStatus:
        try:
            result = await asyncio.wait_for(item.checker(), timeout=item.timeout_seconds)
        except TimeoutError:
            return DependencyStatus(name=item.name, ok=False, detail="timeout")
        except Exception as exc:  # noqa: BLE001 — probe must never 500 the endpoint
            logger.warning("dependency check %s failed: %s", item.name, exc)
            return DependencyStatus(name=item.name, ok=False, detail=str(exc)[:300])
        return DependencyStatus(name=item.name, ok=result.ok, detail=result.detail)


async def check_database() -> CheckResult:
    """``SELECT 1`` against the process session factory."""
    from app.core.db import get_session_factory

    async with get_session_factory()() as session:
        await session.execute(text("SELECT 1"))
    return CheckResult(ok=True)


async def check_kubernetes() -> CheckResult:
    """Reach the gateway cluster via ``VersionApi.get_code()``."""
    from kubernetes_asyncio.client import VersionApi

    from app.services.k8s.client_manager import k8s_manager

    api_client = await k8s_manager.get_gateway_client()
    info = await VersionApi(api_client).get_code()
    version = getattr(info, "git_version", None)
    detail = str(version) if version else None
    return CheckResult(ok=True, detail=detail)


def build_default_registry() -> DependencyCheckRegistry:
    """First-ship set: database + kubernetes. Add middleware here later."""
    registry = DependencyCheckRegistry()
    registry.register(
        "database",
        check_database,
        timeout_seconds=DATABASE_CHECK_TIMEOUT_SECONDS,
    )
    registry.register(
        "kubernetes",
        check_kubernetes,
        timeout_seconds=KUBERNETES_CHECK_TIMEOUT_SECONDS,
    )
    return registry


_registry: DependencyCheckRegistry | None = None
_cache_payload: dict | None = None
_cache_expires_at: float = 0.0
_cache_lock = asyncio.Lock()


def get_registry() -> DependencyCheckRegistry:
    global _registry
    if _registry is None:
        _registry = build_default_registry()
    return _registry


def set_registry(registry: DependencyCheckRegistry | None) -> None:
    """Replace (or clear) the process registry. Tests use this to inject extras."""
    global _registry
    _registry = registry


def reset_dependency_cache() -> None:
    global _cache_payload, _cache_expires_at
    _cache_payload = None
    _cache_expires_at = 0.0


async def snapshot_dependencies(
    registry: DependencyCheckRegistry | None = None,
    *,
    now: float | None = None,
) -> dict:
    """Return a TTL-cached snapshot. Concurrent callers share one probe."""
    global _cache_payload, _cache_expires_at

    loop = asyncio.get_running_loop()
    current = loop.time() if now is None else now
    cached = _cache_payload
    if cached is not None and current < _cache_expires_at:
        return cached

    async with _cache_lock:
        current = loop.time() if now is None else now
        cached = _cache_payload
        if cached is not None and current < _cache_expires_at:
            return cached
        active = registry if registry is not None else get_registry()
        statuses = await active.run_all()
        payload = {
            "dependencies": [status.as_dict() for status in statuses],
            "ok": all(status.ok for status in statuses),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
        _cache_payload = payload
        _cache_expires_at = current + CACHE_TTL_SECONDS
        return payload
