from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


async def get_documents_by_course(db: AsyncSession, course_id: int) -> List[Document]:
    result = await db.execute(
        select(Document).where(Document.course_id == course_id).order_by(Document.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def get_document_by_id(db: AsyncSession, document_id: int) -> Optional[Document]:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalars().first()


async def create_document(
    db: AsyncSession,
    course_id: int,
    title: str,
    file_name: str,
    file_type: str,
    file_key: str,
    file_url: str | None,
    size: int,
    content_text: str
) -> Document:
    db_document = Document(
        course_id=course_id,
        title=title,
        file_name=file_name,
        file_type=file_type,
        file_key=file_key,
        file_url=file_url,
        size=size,
        content_text=content_text,
    )
    db.add(db_document)
    await db.flush()
    await db.refresh(db_document)
    return db_document


async def delete_document(db: AsyncSession, document_id: int) -> bool:
    db_document = await get_document_by_id(db, document_id)
    if not db_document:
        return False
    await db.delete(db_document)
    await db.flush()
    return True
