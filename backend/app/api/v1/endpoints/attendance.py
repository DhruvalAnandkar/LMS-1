from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.attendance import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    BulkAttendanceCreate, AttendanceSummary
)
from app.services import attendance as attendance_service
from app.services import course as course_service
from app.services import module as module_service
from app.core.security import get_current_user, RoleChecker
from app.models.user import User, UserRole

router = APIRouter(prefix="/lessons/{lesson_id}/attendance", tags=["Attendance"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


@router.get("", response_model=List[AttendanceResponse])
async def get_lesson_attendance(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    lesson = await module_service.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    attendances = await attendance_service.get_attendance_by_lesson(db, lesson_id)
    return attendances


@router.post("", response_model=List[AttendanceResponse])
async def mark_bulk_attendance(
    lesson_id: int,
    bulk_data: BulkAttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    lesson = await module_service.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    attendances = await attendance_service.bulk_mark_attendance(
        db, lesson_id, bulk_data.records
    )
    return attendances


@router.get("/summary", response_model=List[AttendanceSummary])
async def get_course_attendance_summary(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    summaries = await attendance_service.get_course_attendance_summary(db, course_id)
    return summaries


@router.get("/my/summary", response_model=AttendanceSummary)
async def get_my_attendance_summary(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    is_enrolled = await course_service.is_enrolled(db, course_id, current_user.id)
    if not is_enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled")
    
    summary = await attendance_service.get_student_course_attendance(db, current_user.id, course_id)
    return summary
