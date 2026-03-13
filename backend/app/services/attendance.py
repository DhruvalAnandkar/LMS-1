from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance
from app.models.user import User
from app.models.module import Lesson, Module
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceSummary


async def mark_attendance(db: AsyncSession, lesson_id: int, record: AttendanceCreate) -> Attendance:
    result = await db.execute(
        select(Attendance).where(
            Attendance.lesson_id == lesson_id,
            Attendance.student_id == record.student_id
        )
    )
    existing = result.scalars().first()
    
    if existing:
        existing.present = record.present
        await db.flush()
        await db.refresh(existing)
        return existing
    
    db_attendance = Attendance(
        lesson_id=lesson_id,
        student_id=record.student_id,
        present=record.present,
    )
    db.add(db_attendance)
    await db.flush()
    await db.refresh(db_attendance)
    return db_attendance


async def bulk_mark_attendance(db: AsyncSession, lesson_id: int, records: List[AttendanceCreate]) -> List[Attendance]:
    attendances = []
    for record in records:
        attendance = await mark_attendance(db, lesson_id, record)
        attendances.append(attendance)
    return attendances


async def get_attendance_by_lesson(db: AsyncSession, lesson_id: int) -> List[Attendance]:
    result = await db.execute(
        select(Attendance).where(Attendance.lesson_id == lesson_id)
    )
    return list(result.scalars().all())


async def get_attendance_by_student(db: AsyncSession, student_id: int) -> List[Attendance]:
    result = await db.execute(
        select(Attendance).where(Attendance.student_id == student_id)
    )
    return list(result.scalars().all())


async def get_course_attendance_summary(db: AsyncSession, course_id: int) -> List[AttendanceSummary]:
    result = await db.execute(
        select(
            User.id,
            User.full_name,
            func.count(Attendance.id).label("total"),
            func.sum(func.cast(Attendance.present, int)).label("present")
        )
        .join(Module, Module.course_id == course_id)
        .join(Lesson, Lesson.module_id == Module.id)
        .join(Attendance, Attendance.lesson_id == Lesson.id)
        .join(User, User.id == Attendance.student_id)
        .group_by(User.id, User.full_name)
    )
    
    summaries = []
    for row in result:
        total = row.total or 0
        present = row.present or 0
        absent = total - present
        percentage = (present / total * 100) if total > 0 else 0.0
        summaries.append(AttendanceSummary(
            student_id=row.id,
            student_name=row.full_name,
            total_lessons=total,
            present_count=present,
            absent_count=absent,
            attendance_percentage=round(percentage, 2)
        ))
    return summaries


async def get_student_course_attendance(db: AsyncSession, student_id: int, course_id: int) -> AttendanceSummary:
    result = await db.execute(
        select(
            User.full_name,
            func.count(Attendance.id).label("total"),
            func.sum(func.cast(Attendance.present, int)).label("present")
        )
        .join(Module, Module.course_id == course_id)
        .join(Lesson, Lesson.module_id == Module.id)
        .join(Attendance, Attendance.lesson_id == Lesson.id)
        .where(Attendance.student_id == student_id)
        .group_by(User.full_name)
    )
    
    row = result.first()
    if not row:
        return AttendanceSummary(
            student_id=student_id,
            student_name="",
            total_lessons=0,
            present_count=0,
            absent_count=0,
            attendance_percentage=0.0
        )
    
    total = row.total or 0
    present = row.present or 0
    absent = total - present
    percentage = (present / total * 100) if total > 0 else 0.0
    
    return AttendanceSummary(
        student_id=student_id,
        student_name=row.full_name,
        total_lessons=total,
        present_count=present,
        absent_count=absent,
        attendance_percentage=round(percentage, 2)
    )
