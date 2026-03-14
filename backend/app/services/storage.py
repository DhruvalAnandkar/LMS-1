from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions

from app.core.config import settings


def _parse_connection_string(conn_str: str) -> tuple[Optional[str], Optional[str]]:
    account_name = None
    account_key = None
    for part in conn_str.split(";"):
        if part.startswith("AccountName="):
            account_name = part.split("=", 1)[1]
        elif part.startswith("AccountKey="):
            account_key = part.split("=", 1)[1]
    return account_name, account_key


@dataclass
class BlobUploadResult:
    blob_key: str
    blob_url: str
    content_type: str
    size: int


class BlobStorage:
    def __init__(self) -> None:
        if not settings.AZURE_STORAGE_CONNECTION_STRING:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING is not configured")
        self._client = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        self._account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
        self._account_key = settings.AZURE_STORAGE_ACCOUNT_KEY
        if not self._account_name or not self._account_key:
            parsed_name, parsed_key = _parse_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
            self._account_name = self._account_name or parsed_name
            self._account_key = self._account_key or parsed_key
        self._ensured_containers: set[str] = set()

    def _ensure_container(self, container: str) -> None:
        if container in self._ensured_containers:
            return
        container_client = self._client.get_container_client(container)
        try:
            container_client.create_container()
        except ResourceExistsError:
            pass
        self._ensured_containers.add(container)

    def upload_bytes(
        self,
        container: str,
        blob_key: str,
        data: bytes,
        content_type: str,
    ) -> BlobUploadResult:
        self._ensure_container(container)
        blob_client = self._client.get_blob_client(container=container, blob=blob_key)
        blob_client.upload_blob(
            data,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        return BlobUploadResult(
            blob_key=blob_key,
            blob_url=blob_client.url,
            content_type=content_type,
            size=len(data),
        )

    def delete_blob(self, container: str, blob_key: str) -> None:
        blob_client = self._client.get_blob_client(container=container, blob=blob_key)
        blob_client.delete_blob(delete_snapshots="include")

    def get_blob_url(self, container: str, blob_key: str) -> str:
        blob_client = self._client.get_blob_client(container=container, blob=blob_key)
        if (
            settings.AZURE_STORAGE_USE_SAS
            and self._account_name
            and self._account_key
        ):
            sas_token = generate_blob_sas(
                account_name=self._account_name,
                container_name=container,
                blob_name=blob_key,
                account_key=self._account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(minutes=settings.AZURE_STORAGE_SAS_EXPIRY_MINUTES),
            )
            return f"{blob_client.url}?{sas_token}"
        return blob_client.url
