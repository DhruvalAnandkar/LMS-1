from __future__ import annotations

import time
from typing import Callable

from fastapi import HTTPException, Request, status

_RATE_LIMIT_STORE: dict[str, list[float]] = {}


def rate_limiter(max_requests: int, window_seconds: int) -> Callable[[Request], None]:
    async def dependency(request: Request) -> None:
        now = time.time()
        key = f"{request.client.host}:{request.url.path}"
        timestamps = _RATE_LIMIT_STORE.get(key, [])
        timestamps = [ts for ts in timestamps if now - ts < window_seconds]
        if len(timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        timestamps.append(now)
        _RATE_LIMIT_STORE[key] = timestamps

    return dependency
