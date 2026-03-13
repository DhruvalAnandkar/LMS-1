from typing import Optional, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate


async def get_assignment_by_id(db: AsyncSession, assignment_id: int) -> Optional[Assignment]:
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    return result.scalars().first()


async def get_assignments_by_course(db: AsyncSession, course_id: int) -> List[Assignment]:
    result = await db.execute(
        select(Assignment).where(Assignment.course_id == course_id).order_by(Assignment.due_date)
    )
    return list(result.scalars().all())


async def create_assignment(db: AsyncSession, course_id: int, assignment: AssignmentCreate) -> Assignment:
    db_assignment = Assignment(
        title=assignment.title,
        description=assignment.description,
        rubric=assignment.rubric,
        due_date=assignment.due_date,
        course_id=course_id,
    )
    db.add(db_assignment)
    await db.flush()
    await db.refresh(db_assignment)
    return db_assignment


async def update_assignment(db: AsyncSession, assignment_id: int, assignment_update: AssignmentUpdate) -> Optional[Assignment]:
    db_assignment = await get_assignment_by_id(db, assignment_id)
    if not db_assignment:
        return None
    
    update_data = assignment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_assignment, field, value)
    
    await db.flush()
    await db.refresh(db_assignment)
    return db_assignment


async def delete_assignment(db: AsyncSession, assignment_id: int) -> bool:
    db_assignment = await get_assignment_by_id(db, assignment_id)
    if not db_assignment:
        return False
    await db.delete(db_assignment)
    await db.flush()
    return True


async def get_submission_by_id(db: AsyncSession, submission_id: int) -> Optional[Submission]:
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    return result.scalars().first()


async def get_submissions_by_assignment(db: AsyncSession, assignment_id: int) -> List[Submission]:
    result = await db.execute(
        select(Submission).where(Submission.assignment_id == assignment_id)
    )
    return list(result.scalars().all())


async def get_submissions_by_student(db: AsyncSession, student_id: int) -> List[Submission]:
    result = await db.execute(
        select(Submission).where(Submission.student_id == student_id)
    )
    return list(result.scalars().all())


async def get_pending_submissions(db: AsyncSession, course_id: int) -> List[Submission]:
    result = await db.execute(
        select(Submission)
        .join(Assignment)
        .where(
            Assignment.course_id == course_id,
            Submission.status == SubmissionStatus.PENDING_REVIEW
        )
    )
    return list(result.scalars().all())


async def create_submission(db: AsyncSession, assignment_id: int, student_id: int, content: str) -> Submission:
    db_submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        content=content,
    )
    db.add(db_submission)
    await db.flush()
    await db.refresh(db_submission)
    return db_submission


async def update_ai_grade(
    db: AsyncSession,
    submission_id: int,
    ai_grade: float,
    ai_feedback: str
) -> Optional[Submission]:
    db_submission = await get_submission_by_id(db, submission_id)
    if not db_submission:
        return None
    
    db_submission.ai_grade = ai_grade
    db_submission.ai_feedback = ai_feedback
    await db.flush()
    await db.refresh(db_submission)
    return db_submission


async def approve_grade(db: AsyncSession, submission_id: int) -> Optional[Submission]:
    db_submission = await get_submission_by_id(db, submission_id)
    if not db_submission:
        return None
    
    db_submission.final_grade = db_submission.ai_grade
    db_submission.status = SubmissionStatus.APPROVED
    db_submission.graded_at = datetime.utcnow()
    await db.flush()
    await db.refresh(db_submission)
    return db_submission


async def update_manual_grade(
    db: AsyncSession,
    submission_id: int,
    final_grade: float,
    status: SubmissionStatus = SubmissionStatus.APPROVED
) -> Optional[Submission]:
    db_submission = await get_submission_by_id(db, submission_id)
    if not db_submission:
        return None
    
    db_submission.final_grade = final_grade
    db_submission.status = status
    db_submission.graded_at = datetime.utcnow()
    await db.flush()
    await db.refresh(db_submission)
    return db_submission
