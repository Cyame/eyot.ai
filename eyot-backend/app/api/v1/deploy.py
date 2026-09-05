"""Deploy progress SSE endpoint + snapshot + cancel.

P11c wires the in-process EventBus to FastAPI's StreamingResponse so that
P12's portal can subscribe via EventSource and watch a deploy pipeline's
9-step progress live.

Routes
------
- ``GET  /deploy/deploy-progress/{record_id}``            — SSE stream
- ``GET  /deploy/deploy-progress/{record_id}/snapshot``   — current state
- ``POST /deploy/deploy-cancel/{record_id}``              — cancel run

The cancel route imports :func:`app.services.deploy_service.cancel_deploy`
lazily (P11c Todo 1) so this module loads even before the service ships.
"""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import DB, CurrentUserDep
from app.core.openapi import add_error_responses
from app.models.deploy_record import DeployRecord, DeployStatus
from app.services.k8s.event_bus import event_bus

router = APIRouter(prefix="/deploy", tags=["Deploy"])
add_error_responses(router)

SSE_PING_INTERVAL_SECONDS = 30.0


async def iter_deploy_sse(record_id: str, request: Request | None = None):
    """Yield SSE frames for a deploy record, pinging on idle."""
    queue, cleanup = event_bus.create_subscription("deploy_progress")
    try:
        while True:
            try:
                sse_event = await asyncio.wait_for(
                    queue.get(), timeout=SSE_PING_INTERVAL_SECONDS
                )
            except TimeoutError:
                yield f"event: ping\ndata: {json.dumps({'type': 'ping'})}\n\n"
                if request is not None and await request.is_disconnected():
                    break
                continue
            payload = sse_event.data
            if payload.get("record_id") != record_id:
                continue
            yield sse_event.format()
            if request is not None and await request.is_disconnected():
                break
    finally:
        cleanup()


async def _load_active_record(record_id: str, db) -> DeployRecord:
    """Return the active DeployRecord or raise 404.

    Filters ``deleted_at IS NULL`` so soft-deleted rows are invisible.
    """
    result = await db.execute(
        select(DeployRecord).where(
            DeployRecord.id == record_id,
            DeployRecord.deleted_at.is_(None),
        )
    )
    record = result.scalars().first()
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "deploy_record.not_found",
                    "message": "DeployRecord not found"},
        )
    return record


@router.get("/deploy-progress/{record_id}")
async def stream_deploy_progress(
    record_id: str,
    request: Request,
    db: DB,
    current_user: CurrentUserDep,
) -> StreamingResponse:
    """SSE stream of deploy progress events scoped to ``record_id``.

    Subscribes to the ``deploy_progress`` channel and forwards any event
    whose payload matches the requested record. Closes cleanly when the
    client disconnects.
    """
    await _load_active_record(record_id, db)

    async def event_generator():
        async for frame in iter_deploy_sse(record_id, request):
            yield frame

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/deploy-progress/{record_id}/snapshot")
async def deploy_snapshot(
    record_id: str,
    db: DB,
    current_user: CurrentUserDep,
) -> dict:
    """Return the current persisted state of a DeployRecord (non-stream).

    The snapshot is the sync pair to the SSE stream: clients open the
    stream first, then poll the snapshot if they reconnect late.
    """
    record = await _load_active_record(record_id, db)
    return {
        "id": record.id,
        "instance_id": record.instance_id,
        "revision": record.revision,
        "action": record.action,
        "status": record.status,
        "image_version": record.image_version,
        "started_at": record.started_at,
        "finished_at": record.finished_at,
        "message": record.message,
    }


@router.post("/deploy-cancel/{record_id}")
async def deploy_cancel(
    record_id: str,
    db: DB,
    current_user: CurrentUserDep,
) -> dict:
    """Cancel a running deploy and mark its record ``cancelled``.

    Delegates to :func:`app.services.deploy_service.cancel_deploy` (P11c
    Todo 1) — imported lazily so this module stays loadable while the
    service is still being authored in parallel.
    """
    from app.services.deploy_service import cancel_deploy  # lazy import

    await _load_active_record(record_id, db)
    namespace = await cancel_deploy(record_id)
    return {
        "record_id": record_id,
        "namespace": namespace,
        "status": DeployStatus.cancelled.value,
    }
