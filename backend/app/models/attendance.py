from datetime import datetime
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    present = Column(Boolean, default=False)
    marked_at = Column(DateTime, default=datetime.utcnow)

    lesson = relationship("Lesson", back_populates="attendance_records")
    student = relationship("User", back_populates="attendance_records")
