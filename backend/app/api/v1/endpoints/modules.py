from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.module import ModuleCreate, ModuleUpdate, ModuleResponse, LessonCreate, LessonUpdate, LessonResponse
from app.services import module as module_service
from app.services import course as course_service
from app.core.security import get_current_user, RoleChecker
from app.models.user import User, UserRole

router = APIRouter(prefix="/courses/{course_id}/modules", tags=["Modules"])

teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])


@router.get("", response_model=List[ModuleResponse])
async def list_modules(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    modules = await module_service.get_modules_by_course(db, course_id)
    return modules


@router.post("", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: int,
    module: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    created_module = await module_service.create_module(db, course_id, module)
    return created_module


@router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    course_id: int,
    module_id: int,
    module_update: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_module = await module_service.update_module(db, module_id, module_update)
    if not updated_module:
        raise HTTPException(status_code=404, detail="Module not found")
    return updated_module


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    course_id: int,
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.teacher_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = await module_service.delete_module(db, module_id)
    if not success:
        raise HTTPException(status_code=404, detail="Module not found")


lessons_router = APIRouter(prefix="/modules/{module_id}/lessons", tags=["Lessons"])


@lessons_router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    module_id: int,
    lesson: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    module = await module_service.get_module_by_id(db, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    created_lesson = await module_service.create_lesson(db, module_id, lesson)
    return created_lesson


@lessons_router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    module_id: int,
    lesson_id: int,
    lesson_update: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    updated_lesson = await module_service.update_lesson(db, lesson_id, lesson_update)
    if not updated_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return updated_lesson


@lessons_router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    module_id: int,
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(teacher_admin)
):
    success = await module_service.delete_lesson(db, lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lesson not found")
