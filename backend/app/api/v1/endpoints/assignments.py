from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    SubmissionCreate, SubmissionResponse, GradeUpdate, AIGradeResponse
)
from app.services import assignment as assignment_service
from app.services import course as course_service
from app.core.security import get_current_user, RoleChecker
from app.models.user import User, UserRole

router = APIRouter(prefix="/courses/{course_id}/assignments", tags=["Assignments"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


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
        db, assignment_id, current_user.id, submission.content
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
    return submissions
