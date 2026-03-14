from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    SubmissionCreate, SubmissionResponse, GradeUpdate, AIGradeResponse
)
from app.services import assignment as assignment_service
from app.services import course as course_service
from app.services.storage import BlobStorage
from app.services import document_service as doc_ingest
from app.ai import grader as grader_service
from app.core.security import get_current_user, RoleChecker
from app.core.config import settings
from app.core.audit import audit_log
from app.models.user import User, UserRole

router = APIRouter(prefix="/courses/{course_id}/assignments", tags=["Assignments"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


def _submission_file_url(storage: BlobStorage, file_key: str) -> str | None:
    if file_key == "inline":
        return None
    return storage.get_blob_url(settings.AZURE_STORAGE_SUBMISSIONS_CONTAINER, file_key)


@router.get("", response_model=List[AssignmentResponse])
async def list_assignments(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    assignments = await assignment_service.get_assignments_by_course(db, course_id)
    return assignments


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    course_id: int,
    assignment: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    created_assignment = await assignment_service.create_assignment(db, course_id, assignment)
    return created_assignment


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    course_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    course_id: int,
    assignment_id: int,
    assignment_update: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await course_service.get_course_by_id(db, course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_assignment = await assignment_service.update_assignment(db, assignment_id, assignment_update)
    return updated_assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    course_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await course_service.get_course_by_id(db, course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await assignment_service.delete_assignment(db, assignment_id)


@router.post("/{assignment_id}/submit", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    course_id: int,
    assignment_id: int,
    submission: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    is_enrolled = await course_service.is_enrolled(db, course_id, current_user.id)
    if not is_enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    created_submission = await assignment_service.create_submission(
        db, assignment_id, current_user.id, submission.content, "text.txt", "inline", None, "text/plain", len(submission.content)
    )
    return created_submission


@router.get("/{assignment_id}/submissions", response_model=List[SubmissionResponse])
async def list_submissions(
    course_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await course_service.get_course_by_id(db, course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await assignment_service.get_submissions_by_assignment(db, assignment_id)
    storage = BlobStorage()
    return [
        SubmissionResponse(
            id=sub.id,
            assignment_id=sub.assignment_id,
            student_id=sub.student_id,
            content=sub.content,
            file_name=sub.file_name,
            file_key=sub.file_key,
            file_url=_submission_file_url(storage, sub.file_key),
            content_type=sub.content_type,
            size=sub.size,
            ai_grade=sub.ai_grade,
            ai_feedback=sub.ai_feedback,
            final_grade=sub.final_grade,
            status=sub.status,
            submitted_at=sub.submitted_at,
            graded_at=sub.graded_at,
            student=sub.student and {
                "id": sub.student.id,
                "full_name": sub.student.full_name,
                "email": sub.student.email,
            },
            assignment=sub.assignment and {
                "id": sub.assignment.id,
                "title": sub.assignment.title,
                "course_id": sub.assignment.course_id,
            },
        )
        for sub in submissions
    ]


assignments_router = APIRouter(prefix="/assignments", tags=["Assignments"])


@assignments_router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment_by_id(
    assignment_id: int,
    db: AsyncSession = Depends(get_db)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@assignments_router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment_by_id(
    assignment_id: int,
    assignment_update: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = await course_service.get_course_by_id(db, assignment.course_id)
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    updated_assignment = await assignment_service.update_assignment(db, assignment_id, assignment_update)
    return updated_assignment


@assignments_router.post("/{assignment_id}/submit", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_assignment_file(
    assignment_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    assignment = await assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    is_enrolled = await course_service.is_enrolled(db, assignment.course_id, current_user.id)
    if not is_enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="File exceeds size limit")

    content_type = file.content_type or "application/octet-stream"
    extracted_text = doc_ingest.extract_text_from_bytes(content, content_type)
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No text content found in file")

    storage = BlobStorage()
    blob_key = f"courses/{assignment.course_id}/assignments/{assignment_id}/submissions/{uuid.uuid4()}_{file.filename}"
    upload_result = storage.upload_bytes(
        container=settings.AZURE_STORAGE_SUBMISSIONS_CONTAINER,
        blob_key=blob_key,
        data=content,
        content_type=content_type,
    )

    created_submission = await assignment_service.create_submission(
        db,
        assignment_id,
        current_user.id,
        extracted_text,
        file.filename,
        upload_result.blob_key,
        upload_result.blob_url,
        content_type,
        upload_result.size,
    )
    return SubmissionResponse(
        id=created_submission.id,
        assignment_id=created_submission.assignment_id,
        student_id=created_submission.student_id,
        content=created_submission.content,
        file_name=created_submission.file_name,
        file_key=created_submission.file_key,
        file_url=_submission_file_url(storage, created_submission.file_key),
        content_type=created_submission.content_type,
        size=created_submission.size,
        ai_grade=created_submission.ai_grade,
        ai_feedback=created_submission.ai_feedback,
        final_grade=created_submission.final_grade,
        status=created_submission.status,
        submitted_at=created_submission.submitted_at,
        graded_at=created_submission.graded_at,
    )


@assignments_router.post("/{assignment_id}/grade/ai", response_model=List[AIGradeResponse])
async def grade_assignment_submissions(
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

    responses: List[AIGradeResponse] = []
    for submission in submissions:
        grade, feedback = await grader_service.grade_submission(
            submission_content=submission.content,
            assignment_title=assignment.title,
            assignment_description=assignment.description or "",
            assignment_rubric=assignment.rubric or "",
            course_id=assignment.course_id
        )
        await assignment_service.update_ai_grade(db, submission.id, grade, feedback)
        responses.append(AIGradeResponse(ai_grade=grade, ai_feedback=feedback))
    audit_log("ai_grade_batch_generated", current_user.id, {"assignment_id": assignment_id})
    return responses
