"""System-level operational endpoints (not the System hub).

``GET /system/dependencies`` reports whether backend-side middleware the
portal cares about is reachable. It must stay alive when Postgres is down,
so authentication is JWT-only (no user-table lookup) and the probe never
raises through to a 500.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUserJwtDep
from app.core.openapi import add_error_responses
from app.services.dependency_checks import snapshot_dependencies

router = APIRouter(prefix="/system", tags=["System"])
add_error_responses(router)


@router.get("/dependencies")
async def get_system_dependencies(_current_user: CurrentUserJwtDep) -> dict:
    """Return the latest dependency snapshot (200 even when some checks fail)."""
    return await snapshot_dependencies()
