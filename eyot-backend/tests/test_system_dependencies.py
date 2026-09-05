"""Tests for GET /api/v1/system/dependencies and the check registry primitive."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from starlette.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.services.dependency_checks import (
    CACHE_TTL_SECONDS,
    CheckResult,
    DependencyCheckRegistry,
    reset_dependency_cache,
    set_registry,
    snapshot_dependencies,
)


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, tag: str) -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": f"wd-{tag}-{uuid.uuid4().hex[:6]}",
            "email": f"wd-{tag}-{uuid.uuid4().hex[:6]}@test.com",
            "password": "password123",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture(autouse=True)
def _reset_watchdog_state(monkeypatch: pytest.MonkeyPatch):
    reset_dependency_cache()
    set_registry(None)

    async def fake_k8s() -> CheckResult:
        return CheckResult(ok=True, detail="fake-k8s")

    monkeypatch.setattr("app.services.dependency_checks.check_kubernetes", fake_k8s)
    yield
    reset_dependency_cache()
    set_registry(None)


@pytest.mark.asyncio
async def test_registry_extension_adds_third_check_without_changing_others() -> None:
    """A mock redis check appears alongside database + kubernetes."""
    registry = DependencyCheckRegistry()
    calls: list[str] = []

    async def database() -> CheckResult:
        calls.append("database")
        return CheckResult(ok=True)

    async def kubernetes() -> CheckResult:
        calls.append("kubernetes")
        return CheckResult(ok=True)

    async def redis() -> CheckResult:
        calls.append("redis")
        return CheckResult(ok=False, detail="connection refused")

    registry.register("database", database, timeout_seconds=1)
    registry.register("kubernetes", kubernetes, timeout_seconds=1)
    registry.register("redis", redis, timeout_seconds=1)
    statuses = await registry.run_all()
    names = [status.name for status in statuses]
    assert names == ["database", "kubernetes", "redis"]
    by_name = {status.name: status for status in statuses}
    assert by_name["database"].ok is True
    assert by_name["kubernetes"].ok is True
    assert by_name["redis"].ok is False
    assert "refused" in (by_name["redis"].detail or "")
    assert set(calls) == {"database", "kubernetes", "redis"}


@pytest.mark.asyncio
async def test_registry_normalizes_checker_exception_and_timeout() -> None:
    registry = DependencyCheckRegistry()

    async def boom() -> CheckResult:
        raise RuntimeError("redis down")

    async def slow() -> CheckResult:
        await asyncio.sleep(1)
        return CheckResult(ok=True)

    registry.register("redis", boom, timeout_seconds=1)
    registry.register("mq", slow, timeout_seconds=0.01)
    statuses = await registry.run_all()
    by_name = {status.name: status for status in statuses}
    assert by_name["redis"].ok is False
    assert "redis down" in (by_name["redis"].detail or "")
    assert by_name["mq"].ok is False
    assert by_name["mq"].detail == "timeout"


@pytest.mark.asyncio
async def test_snapshot_ttl_cache_probes_once() -> None:
    registry = DependencyCheckRegistry()
    hits = {"n": 0}

    async def probe() -> CheckResult:
        hits["n"] += 1
        return CheckResult(ok=True)

    registry.register("database", probe, timeout_seconds=1)
    first = await snapshot_dependencies(registry, now=0.0)
    second = await snapshot_dependencies(registry, now=CACHE_TTL_SECONDS - 0.1)
    assert first == second
    assert hits["n"] == 1
    await snapshot_dependencies(registry, now=CACHE_TTL_SECONDS + 0.1)
    assert hits["n"] == 2


def test_dependencies_healthy(client: TestClient) -> None:
    body = _register(client, "ok")
    resp = client.get("/api/v1/system/dependencies", headers=_auth(body["access_token"]))
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["ok"] is True
    names = [item["name"] for item in payload["dependencies"]]
    assert names == ["database", "kubernetes"]
    assert all(item["ok"] is True for item in payload["dependencies"])
    assert "checked_at" in payload


def test_dependencies_k8s_down_returns_200(client: TestClient) -> None:
    async def down() -> CheckResult:
        return CheckResult(ok=False, detail="cluster unreachable")

    registry = DependencyCheckRegistry()

    async def database() -> CheckResult:
        return CheckResult(ok=True)

    registry.register("database", database, timeout_seconds=1)
    registry.register("kubernetes", down, timeout_seconds=1)
    set_registry(registry)

    body = _register(client, "k8s")
    resp = client.get("/api/v1/system/dependencies", headers=_auth(body["access_token"]))
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["ok"] is False
    by_name = {item["name"]: item for item in payload["dependencies"]}
    assert by_name["database"]["ok"] is True
    assert by_name["kubernetes"]["ok"] is False
    assert "unreachable" in (by_name["kubernetes"]["detail"] or "")


def test_dependencies_database_down_returns_200(client: TestClient) -> None:
    async def db_down() -> CheckResult:
        raise RuntimeError("connection refused")

    async def k8s_ok() -> CheckResult:
        return CheckResult(ok=True)

    registry = DependencyCheckRegistry()
    registry.register("database", db_down, timeout_seconds=1)
    registry.register("kubernetes", k8s_ok, timeout_seconds=1)
    set_registry(registry)

    body = _register(client, "pg")
    resp = client.get("/api/v1/system/dependencies", headers=_auth(body["access_token"]))
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["ok"] is False
    by_name = {item["name"]: item for item in payload["dependencies"]}
    assert by_name["database"]["ok"] is False
    assert by_name["kubernetes"]["ok"] is True


def test_dependencies_jwt_only_does_not_lookup_user(client: TestClient) -> None:
    """A token whose sub is not in the user table still authenticates."""
    token = create_access_token("missing-user-id", False, settings.JWT_SECRET)
    resp = client.get("/api/v1/system/dependencies", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True


def test_dependencies_missing_token_401(client: TestClient) -> None:
    resp = client.get("/api/v1/system/dependencies")
    assert resp.status_code == 401
    payload = resp.json()
    assert payload["error_code"] == "auth.token_missing"
    assert payload["message_key"] == "errors.auth.token_missing"


def test_dependencies_invalid_token_401(client: TestClient) -> None:
    resp = client.get("/api/v1/system/dependencies", headers=_auth("not-a-jwt"))
    assert resp.status_code == 401
    payload = resp.json()
    assert payload["error_code"] == "auth.token_invalid"
    assert payload["message_key"] == "errors.auth.token_invalid"
