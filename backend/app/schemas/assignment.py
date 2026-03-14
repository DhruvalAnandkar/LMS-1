from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.submission import SubmissionStatus


class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    rubric: Optional[str] = None
    due_date: Optional[datetime] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rubric: Optional[str] = None
    due_date: Optional[datetime] = None


class AssignmentResponse(AssignmentBase):
    id: int
    course_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubmissionBase(BaseModel):
    content: str


class SubmissionCreate(SubmissionBase):
    pass


class SubmissionResponse(SubmissionBase):
    id: int
    assignment_id: int
    student_id: int
    file_name: str
    file_key: str
    file_url: Optional[str] = None
    content_type: str
    size: int
    ai_grade: Optional[float] = None
    ai_feedback: Optional[str] = None
    final_grade: Optional[float] = None
    status: SubmissionStatus
    submitted_at: datetime
    graded_at: Optional[datetime] = None
    student: Optional["SubmissionStudent"] = None
    assignment: Optional["SubmissionAssignment"] = None

    class Config:
        from_attributes = True


class GradeUpdate(BaseModel):
    final_grade: float
    status: SubmissionStatus = SubmissionStatus.APPROVED


class AIGradeResponse(BaseModel):
    ai_grade: float
    ai_feedback: str


class SubmissionStudent(BaseModel):
    id: int
    full_name: str
    email: str


class SubmissionAssignment(BaseModel):
    id: int
    title: str
    course_id: int


SubmissionResponse.model_rebuild()
