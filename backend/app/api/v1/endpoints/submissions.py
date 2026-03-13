from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.assignment import SubmissionResponse, GradeUpdate, AIGradeResponse
from app.services import assignment as assignment_service
from app.services import course as course_service
from app.core.security import get_current_user, RoleChecker
from app.models.user import User, UserRole

router = APIRouter(prefix="/submissions", tags=["Submissions"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


@router.get("/my", response_model=List[SubmissionResponse])
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    submissions = await assignment_service.get_submissions_by_student(db, current_user.id)
    return submissions


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
    
    return submission


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
    course = await course_service.get_course_by_id(db, assignment.course_id)
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status.value != "pending_review":
        raise HTTPException(status_code=400, detail="Submission not pending review")
    
    updated_submission = await assignment_service.approve_grade(db, submission_id)
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
    course = await course_service.get_course_by_id(db, assignment.course_id)
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_submission = await assignment_service.update_manual_grade(
        db, submission_id, grade_update.final_grade, grade_update.status
    )
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
    return submissions
