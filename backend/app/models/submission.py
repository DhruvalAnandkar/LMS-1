from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum as SQLEnum, BigInteger
from sqlalchemy.orm import relationship, validates
import enum

from app.db.session import Base


class SubmissionStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=True)
    file_key = Column(String(512), nullable=True)
    file_url = Column(String(1024), nullable=True)
    content_type = Column(String(100), nullable=True)
    size = Column(BigInteger, nullable=True)
    ai_grade = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    final_grade = Column(Float, nullable=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING_REVIEW)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

    @validates("size")
    def _validate_size(self, key: str, value: int | None) -> int | None:
        if value is None:
            return value
        if value <= 0:
            raise ValueError("Submission size must be a positive value")
        return value
