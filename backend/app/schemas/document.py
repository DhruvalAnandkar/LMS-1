from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentBase(BaseModel):
    title: str


class DocumentResponse(DocumentBase):
    id: int
    course_id: int
    file_name: str
    file_type: str
    file_key: str
    file_url: str | None = None
    size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    message_id: int
