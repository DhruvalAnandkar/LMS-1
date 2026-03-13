from app.schemas.token import Token, TokenData
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserResponse, PasswordReset
from app.schemas.course import CourseBase, CourseCreate, CourseUpdate, CourseResponse, EnrollmentResponse, EnrollResponse
from app.schemas.module import ModuleBase, ModuleCreate, ModuleUpdate, ModuleResponse, LessonBase, LessonCreate, LessonUpdate, LessonResponse
from app.schemas.assignment import AssignmentBase, AssignmentCreate, AssignmentUpdate, AssignmentResponse, SubmissionBase, SubmissionCreate, SubmissionResponse, GradeUpdate, AIGradeResponse
from app.schemas.attendance import AttendanceBase, AttendanceCreate, AttendanceUpdate, AttendanceResponse, BulkAttendanceCreate, AttendanceSummary
from app.schemas.document import DocumentBase, DocumentResponse
from app.schemas.document import ChatMessage, ChatResponse

__all__ = [
    "Token",
    "TokenData",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "PasswordReset",
    "CourseBase",
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "EnrollmentResponse",
    "EnrollResponse",
    "ModuleBase",
    "ModuleCreate",
    "ModuleUpdate",
    "ModuleResponse",
    "LessonBase",
    "LessonCreate",
    "LessonUpdate",
    "LessonResponse",
    "AssignmentBase",
    "AssignmentCreate",
    "AssignmentUpdate",
    "AssignmentResponse",
    "SubmissionBase",
    "SubmissionCreate",
    "SubmissionResponse",
    "GradeUpdate",
    "AIGradeResponse",
    "AttendanceBase",
    "AttendanceCreate",
    "AttendanceUpdate",
    "AttendanceResponse",
    "BulkAttendanceCreate",
    "AttendanceSummary",
    "DocumentBase",
    "DocumentResponse",
    "ChatMessage",
    "ChatResponse",
]
