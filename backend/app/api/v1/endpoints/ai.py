from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.schemas.document import DocumentResponse, ChatMessage, ChatResponse
from app.schemas.assignment import AIGradeResponse
from app.services import course as course_service
from app.services import assignment as assignment_service
from app.services import document as document_service
from app.services import document_service as doc_ingest
from app.ai import chat as chat_service
from app.ai import grader as grader_service
from app.core.security import get_current_user, RoleChecker
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
    
    result = await doc_ingest.ingest_document(course_id, file.filename, file)
    
    await document_service.create_document(
        db=db,
        course_id=course_id,
        title=file.filename,
        file_name=file.filename,
        file_type=file.content_type,
        content_text=""
    )
    
    return {"message": "Document uploaded successfully", **result}


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
    return documents


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
