from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.schemas.course import CourseCreate, CourseUpdate


async def get_course_by_id(db: AsyncSession, course_id: int) -> Optional[Course]:
    result = await db.execute(
        select(Course).options(selectinload(Course.teacher)).where(Course.id == course_id)
    )
    return result.scalars().first()


async def get_courses(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Course]:
    result = await db.execute(
        select(Course).options(selectinload(Course.teacher)).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def get_courses_by_teacher(db: AsyncSession, teacher_id: int) -> List[Course]:
    result = await db.execute(
        select(Course).where(Course.teacher_id == teacher_id)
    )
    return result.scalars().all()


async def create_course(db: AsyncSession, course: CourseCreate, teacher_id: int) -> Course:
    db_course = Course(
        title=course.title,
        description=course.description,
        teacher_id=teacher_id,
    )
    db.add(db_course)
    await db.flush()
    await db.refresh(db_course)
    return db_course


async def update_course(db: AsyncSession, course_id: int, course_update: CourseUpdate) -> Optional[Course]:
    db_course = await get_course_by_id(db, course_id)
    if not db_course:
        return None
    
    update_data = course_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_course, field, value)
    
    await db.flush()
    await db.refresh(db_course)
    return db_course


async def delete_course(db: AsyncSession, course_id: int) -> bool:
    db_course = await get_course_by_id(db, course_id)
    if not db_course:
        return False
    await db.delete(db_course)
    await db.flush()
    return True


async def enroll_student(db: AsyncSession, course_id: int, student_id: int) -> Enrollment:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == student_id
        )
    )
    existing = result.scalars().first()
    if existing:
        return existing
    
    enrollment = Enrollment(course_id=course_id, user_id=student_id)
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


async def get_enrollments(db: AsyncSession, course_id: int) -> List[Enrollment]:
    result = await db.execute(
        select(Enrollment).where(Enrollment.course_id == course_id)
    )
    return result.scalars().all()


async def get_student_enrollments(db: AsyncSession, student_id: int) -> List[Enrollment]:
    result = await db.execute(
        select(Enrollment).where(Enrollment.user_id == student_id)
    )
    return result.scalars().all()


async def is_enrolled(db: AsyncSession, course_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == user_id
        )
    )
    return result.scalars().first() is not None
