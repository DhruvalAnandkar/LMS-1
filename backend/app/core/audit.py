from loguru import logger


def audit_log(action: str, user_id: int | None, metadata: dict | None = None) -> None:
    payload = {
        "action": action,
        "user_id": user_id,
        "metadata": metadata or {},
    }
    logger.info("audit_event={payload}", payload=payload)
