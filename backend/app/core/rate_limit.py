from __future__ import annotations

import time
from typing import Callable

from fastapi import HTTPException, Request, status

_RATE_LIMIT_STORE: dict[str, list[float]] = {}
_LAST_CLEANUP = 0.0


def rate_limiter(max_requests: int, window_seconds: int) -> Callable[[Request], None]:
    async def dependency(request: Request) -> None:
        global _LAST_CLEANUP
        now = time.time()
        client_host = None
        if request.client:
            client_host = request.client.host
        if not client_host:
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                client_host = forwarded_for.split(",")[0].strip()
        if not client_host:
            scope_client = request.scope.get("client")
            if scope_client and len(scope_client) > 0:
                client_host = scope_client[0]
        if not client_host:
            client_host = "unknown"

        if now - _LAST_CLEANUP > window_seconds:
            for key_to_prune, timestamps_to_prune in list(_RATE_LIMIT_STORE.items()):
                if not timestamps_to_prune or now - timestamps_to_prune[-1] >= window_seconds:
                    _RATE_LIMIT_STORE.pop(key_to_prune, None)
            _LAST_CLEANUP = now

        key = f"{client_host}:{request.url.path}"
        timestamps = _RATE_LIMIT_STORE.get(key, [])
        timestamps = [ts for ts in timestamps if now - ts < window_seconds]
        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        timestamps.append(now)
        if timestamps:
            _RATE_LIMIT_STORE[key] = timestamps
        else:
            _RATE_LIMIT_STORE.pop(key, None)

    return dependency
