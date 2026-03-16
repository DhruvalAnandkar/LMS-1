from typing import List
import asyncio
import httpx
from loguru import logger
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.assignment import SubmissionResponse, GradeUpdate, AIGradeResponse
from app.services import assignment as assignment_service
from app.services import course as course_service
from app.core.security import get_current_user, RoleChecker
from app.core.audit import audit_log
from app.services.storage import BlobStorage
from app.core.config import settings
from app.ai import grader as grader_service
from app.models.user import User, UserRole

router = APIRouter(prefix="/submissions", tags=["Submissions"])
course_submissions_router = APIRouter(
    prefix="/courses/{course_id}/submissions",
    tags=["Submissions"]
)


def _submission_file_url(storage: BlobStorage, file_key: str | None) -> str | None:
    if not file_key or file_key == "inline":
        return None
    return storage.get_blob_url(settings.AZURE_STORAGE_SUBMISSIONS_CONTAINER, file_key)


async def _grade_with_retry(
    submission,
    assignment,
    max_attempts: int = 3,
    base_delay: float = 0.5,
):
    last_exc: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await grader_service.grade_submission(
                submission_content=submission.content,
                assignment_title=assignment.title,
                assignment_description=assignment.description or "",
                assignment_rubric=assignment.rubric or "",
                course_id=assignment.course_id
            )
        except (asyncio.TimeoutError, httpx.HTTPError) as exc:
            last_exc = exc
            if attempt < max_attempts - 1:
                await asyncio.sleep(base_delay * (2 ** attempt))
                continue
            raise
        except Exception as exc:
            last_exc = exc
            raise
    if last_exc:
        raise last_exc

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


@router.get("/my", response_model=List[SubmissionResponse])
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    submissions = await assignment_service.get_submissions_by_student(db, current_user.id)
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
            assignment=sub.assignment and {
                "id": sub.assignment.id,
                "title": sub.assignment.title,
                "course_id": sub.assignment.course_id,
            },
        )
        for sub in submissions
    ]


@router.get("", response_model=List[SubmissionResponse])
async def list_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    submissions = await assignment_service.get_submissions_by_student(db, current_user.id)
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
            assignment=sub.assignment and {
                "id": sub.assignment.id,
                "title": sub.assignment.title,
                "course_id": sub.assignment.course_id,
            },
        )
        for sub in submissions
    ]


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    submission = await assignment_service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.student_id != current_user.id and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    storage = BlobStorage()
    return SubmissionResponse(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        content=submission.content,
        file_name=submission.file_name,
        file_key=submission.file_key,
        file_url=_submission_file_url(storage, submission.file_key),
        content_type=submission.content_type,
        size=submission.size,
        ai_grade=submission.ai_grade,
        ai_feedback=submission.ai_feedback,
        final_grade=submission.final_grade,
        status=submission.status,
        submitted_at=submission.submitted_at,
        graded_at=submission.graded_at,
        student=submission.student and {
            "id": submission.student.id,
            "full_name": submission.student.full_name,
            "email": submission.student.email,
        },
        assignment=submission.assignment and {
            "id": submission.assignment.id,
            "title": submission.assignment.title,
            "course_id": submission.assignment.course_id,
        },
    )


@router.post("/{submission_id}/approve-grade", response_model=SubmissionResponse)
async def approve_grade(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    submission = await assignment_service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await assignment_service.get_assignment_by_id(db, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = await course_service.get_course_by_id(db, assignment.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status.value != "pending_review":
        raise HTTPException(status_code=400, detail="Submission not pending review")
    
    updated_submission = await assignment_service.approve_grade(db, submission_id)
    audit_log("grade_approved", current_user.id, {"submission_id": submission_id})
    return updated_submission


@router.put("/{submission_id}/manual-grade", response_model=SubmissionResponse)
async def manual_grade(
    submission_id: int,
    grade_update: GradeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    submission = await assignment_service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await assignment_service.get_assignment_by_id(db, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = await course_service.get_course_by_id(db, assignment.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_submission = await assignment_service.update_manual_grade(
        db, submission_id, grade_update.final_grade, grade_update.status
    )
    audit_log("grade_manual_update", current_user.id, {"submission_id": submission_id})
    return updated_submission


@router.get("/course/{course_id}/pending", response_model=List[SubmissionResponse])
async def get_pending_submissions(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await assignment_service.get_pending_submissions(db, course_id)
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


@router.get("/course/{course_id}", response_model=List[SubmissionResponse])
async def get_course_submissions(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    submissions = await assignment_service.get_submissions_by_course(db, course_id)
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


@course_submissions_router.get("", response_model=List[SubmissionResponse])
async def list_course_submissions(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    submissions = await assignment_service.get_submissions_by_course(db, course_id)
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


@router.post("/{submission_id}/grade/ai", response_model=AIGradeResponse)
async def grade_single_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    submission = await assignment_service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    assignment = await assignment_service.get_assignment_by_id(db, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = await course_service.get_course_by_id(db, assignment.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        grade, feedback = await _grade_with_retry(submission, assignment)
        await assignment_service.update_ai_grade(db, submission.id, grade, feedback)
        audit_log("ai_grade_generated", current_user.id, {"submission_id": submission.id})
        return AIGradeResponse(ai_grade=grade, ai_feedback=feedback)
    except (asyncio.TimeoutError, httpx.HTTPError) as exc:
        logger.exception("AI grading service unavailable for submission {id}", id=submission.id)
        await assignment_service.update_ai_grade(
            db,
            submission.id,
            None,
            "AI grading failed due to a transient error.",
        )
        raise HTTPException(
            status_code=503,
            detail="AI grading service unavailable. Please retry.",
        )
    except Exception as exc:
        logger.exception("AI grading failed for submission {id}", id=submission.id)
        await assignment_service.update_ai_grade(
            db,
            submission.id,
            None,
            "AI grading failed.",
        )
        raise HTTPException(
            status_code=502,
            detail="AI grading failed. Please try again later.",
        )
