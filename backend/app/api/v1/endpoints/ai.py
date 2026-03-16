from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.db.session import get_db
from app.schemas.document import DocumentResponse, ChatMessage, ChatResponse
from app.schemas.assignment import AIGradeResponse
from app.services import course as course_service
from app.services import assignment as assignment_service
from app.services import document as document_service
from app.services import document_service as doc_ingest
from app.services.storage import get_storage
from app.ai import chat as chat_service
from app.ai import grader as grader_service
from app.ai.embedding import delete_vectors_by_filter
from app.core.security import get_current_user, RoleChecker
from app.core.config import settings
from app.core.audit import audit_log
from app.models.user import User, UserRole

router = APIRouter(prefix="/courses/{course_id}", tags=["AI"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


@router.post("/documents", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_document(
    course_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="File exceeds size limit")

    content_type = file.content_type or "application/octet-stream"
    extracted_text = doc_ingest.extract_text_from_bytes(content, content_type)
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No text content found in file")

    storage = get_storage()
    blob_key = f"courses/{course_id}/documents/{uuid.uuid4()}_{file.filename}"
    upload_result = storage.upload_bytes(
        container=settings.AZURE_STORAGE_DOCUMENTS_CONTAINER,
        blob_key=blob_key,
        data=content,
        content_type=content_type,
    )

    document = await document_service.create_document(
        db=db,
        course_id=course_id,
        title=file.filename,
        file_name=file.filename,
        file_type=content_type,
        file_key=upload_result.blob_key,
        file_url=upload_result.blob_url,
        size=upload_result.size,
        content_text=extracted_text,
    )

    await doc_ingest.ingest_document(course_id, document.id, file.filename, extracted_text)
    audit_log("document_uploaded", current_user.id, {"document_id": document.id, "course_id": course_id})

    return DocumentResponse(
        id=document.id,
        course_id=document.course_id,
        title=document.title,
        file_name=document.file_name,
        file_type=document.file_type,
        file_key=document.file_key,
        file_url=storage.get_blob_url(settings.AZURE_STORAGE_DOCUMENTS_CONTAINER, document.file_key),
        size=document.size,
        uploaded_at=document.uploaded_at,
    )


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    documents = await document_service.get_documents_by_course(db, course_id)
    storage = get_storage()
    return [
        DocumentResponse(
            id=doc.id,
            course_id=doc.course_id,
            title=doc.title,
            file_name=doc.file_name,
            file_type=doc.file_type,
            file_key=doc.file_key,
            file_url=storage.get_blob_url(settings.AZURE_STORAGE_DOCUMENTS_CONTAINER, doc.file_key),
            size=doc.size,
            uploaded_at=doc.uploaded_at,
        )
        for doc in documents
    ]


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    course_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    document = await document_service.get_document_by_id(db, document_id)
    if not document or document.course_id != course_id:
        raise HTTPException(status_code=404, detail="Document not found")
    course = await course_service.get_course_by_id(db, course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    storage = get_storage()
    storage.delete_blob(settings.AZURE_STORAGE_DOCUMENTS_CONTAINER, document.file_key)
    await delete_vectors_by_filter(
        {"course_id": str(course_id), "document_id": str(document_id)},
        namespace=str(course_id)
    )
    await document_service.delete_document(db, document_id)
    audit_log("document_deleted", current_user.id, {"document_id": document_id, "course_id": course_id})


@router.post("/chat", response_model=ChatResponse)
async def chat(
    course_id: int,
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    is_enrolled = await course_service.is_enrolled(db, course_id, current_user.id)
    if not is_enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    try:
        response = await chat_service.chat_with_course(
            course_id=course_id,
            user_message=message.message,
            course_context=course.description or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
    
    from app.models.chat_history import ChatHistory
    chat_record = ChatHistory(
        course_id=course_id,
        student_id=current_user.id,
        message=message.message,
        response=response
    )
    db.add(chat_record)
    await db.flush()
    
    return ChatResponse(response=response, message_id=chat_record.id)


grading_router = APIRouter(prefix="/assignments/{assignment_id}/grade", tags=["AI Grading"])


@grading_router.post("/ai", response_model=AIGradeResponse)
async def grade_with_ai(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await course_service.get_course_by_id(db, assignment.course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await assignment_service.get_submissions_by_assignment(db, assignment_id)
    if not submissions:
        raise HTTPException(status_code=404, detail="No submissions found")
    
    submission = submissions[0]
    
    try:
        grade, feedback = await grader_service.grade_submission(
            submission_content=submission.content,
            assignment_title=assignment.title,
            assignment_description=assignment.description or "",
            assignment_rubric=assignment.rubric or "",
            course_id=assignment.course_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading error: {str(e)}")
    
    await assignment_service.update_ai_grade(db, submission.id, grade, feedback)
    
    return AIGradeResponse(ai_grade=grade, ai_feedback=feedback)
