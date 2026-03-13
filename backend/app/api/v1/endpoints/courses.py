from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse, EnrollResponse, EnrollmentResponse
from app.schemas.user import UserResponse
from app.services import course as course_service
from app.core.security import get_current_user, RoleChecker
from app.models.user import User, UserRole

router = APIRouter(prefix="/courses", tags=["Courses"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
student_only = RoleChecker([UserRole.STUDENT])


@router.get("", response_model=List[CourseResponse])
async def list_courses(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    courses = await course_service.get_courses(db, skip, limit)
    return courses


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    created_course = await course_service.create_course(db, course, current_user.id)
    return created_course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this course")
    
    updated_course = await course_service.update_course(db, course_id, course_update)
    return updated_course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")
    
    await course_service.delete_course(db, course_id)


@router.post("/{course_id}/enroll", response_model=EnrollResponse)
async def enroll_student(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_only)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    is_enrolled = await course_service.is_enrolled(db, course_id, current_user.id)
    if is_enrolled:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    enrollment = await course_service.enroll_student(db, course_id, current_user.id)
    return EnrollResponse(message="Successfully enrolled", enrollment=enrollment)


@router.get("/{course_id}/students", response_model=List[UserResponse])
async def get_enrolled_students(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view students")
    
    enrollments = await course_service.get_enrollments(db, course_id)
    students = []
    for enrollment in enrollments:
        student = await course_service.get_user_by_id(db, enrollment.user_id)
        if student:
            students.append(student)
    return students
