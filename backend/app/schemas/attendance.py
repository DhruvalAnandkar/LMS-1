from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AttendanceBase(BaseModel):
    present: bool


class AttendanceCreate(AttendanceBase):
    student_id: int


class AttendanceUpdate(BaseModel):
    present: bool


class AttendanceResponse(AttendanceBase):
    id: int
    lesson_id: int
    student_id: int
    marked_at: datetime

    class Config:
        from_attributes = True


class BulkAttendanceCreate(BaseModel):
    records: List[AttendanceCreate]


class AttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    total_lessons: int
    present_count: int
    absent_count: int
    attendance_percentage: float
