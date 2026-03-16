import asyncio
from datetime import datetime, timedelta

from sqlalchemy import select, delete

from app.db.session import AsyncSessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.module import Module, Lesson
from app.models.enrollment import Enrollment
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.models.attendance import Attendance
from app.models.document import Document
from app.models.chat_history import ChatHistory


async def seed():
    # Ensure tables exist
    await init_db()

    async with AsyncSessionLocal() as session:
        # OPTIONAL: clear existing data (comment out if you don't want this)
        await session.execute(delete(Attendance))
        await session.execute(delete(ChatHistory))
        await session.execute(delete(Document))
        await session.execute(delete(Submission))
        await session.execute(delete(Assignment))
        await session.execute(delete(Enrollment))
        await session.execute(delete(Lesson))
        await session.execute(delete(Module))
        await session.execute(delete(Course))
        await session.execute(delete(User))
        await session.commit()

        # ---------- Users ----------
        admin = User(
            email="admin@example.com",
            full_name="Admin User",
            password_hash=get_password_hash("Admin@123!"),
            role=UserRole.ADMIN,
            requires_password_reset=False,
            is_active=True,
        )
        teacher = User(
            email="teacher@example.com",
            full_name="Teacher One",
            password_hash=get_password_hash("Teacher@123!"),
            role=UserRole.TEACHER,
            requires_password_reset=False,
            is_active=True,
        )
        student1 = User(
            email="student1@example.com",
            full_name="Student One",
            password_hash=get_password_hash("Student1@123!"),
            role=UserRole.STUDENT,
            requires_password_reset=False,
            is_active=True,
        )
        student2 = User(
            email="student2@example.com",
            full_name="Student Two",
            password_hash=get_password_hash("Student2@123!"),
            role=UserRole.STUDENT,
            requires_password_reset=False,
            is_active=True,
        )
        student3 = User(
            email="student3@example.com",
            full_name="Student Three",
            password_hash=get_password_hash("Student3@123!"),
            role=UserRole.STUDENT,
            requires_password_reset=False,
            is_active=True,
        )

        session.add_all([admin, teacher, student1, student2, student3])
        await session.flush()  # populate IDs

        # ---------- Courses ----------
        course1 = Course(
            title="Introduction to AI",
            description="Learn the basics of Artificial Intelligence.",
            teacher_id=teacher.id,
        )
        course2 = Course(
            title="Advanced Databases",
            description="Transactions, indexing, and distributed databases.",
            teacher_id=teacher.id,
        )
        session.add_all([course1, course2])
        await session.flush()

        # ---------- Modules & Lessons ----------
        module1_c1 = Module(
            course_id=course1.id,
            title="AI Fundamentals",
            description="History and core concepts of AI.",
            order=1,
        )
        module2_c1 = Module(
            course_id=course1.id,
            title="Machine Learning Basics",
            description="Supervised and unsupervised learning overview.",
            order=2,
        )

        module1_c2 = Module(
            course_id=course2.id,
            title="Relational Databases",
            description="Normalization, SQL, and indexing.",
            order=1,
        )

        session.add_all([module1_c1, module2_c1, module1_c2])
        await session.flush()

        lesson1 = Lesson(
            module_id=module1_c1.id,
            title="What is AI?",
            content="Overview of AI applications and history.",
            order=1,
        )
        lesson2 = Lesson(
            module_id=module1_c1.id,
            title="Search and Problem Solving",
            content="State spaces, search algorithms, and heuristics.",
            order=2,
        )
        lesson3 = Lesson(
            module_id=module2_c1.id,
            title="Supervised Learning",
            content="Regression and classification basics.",
            order=1,
        )
        lesson4 = Lesson(
            module_id=module1_c2.id,
            title="SQL Fundamentals",
            content="SELECT, INSERT, UPDATE, DELETE and joins.",
            order=1,
        )

        session.add_all([lesson1, lesson2, lesson3, lesson4])
        await session.flush()

        # ---------- Enrollments ----------
        enrollments = [
            Enrollment(user_id=student1.id, course_id=course1.id),
            Enrollment(user_id=student2.id, course_id=course1.id),
            Enrollment(user_id=student3.id, course_id=course1.id),
            Enrollment(user_id=student1.id, course_id=course2.id),
        ]
        session.add_all(enrollments)
        await session.flush()

        # ---------- Assignments ----------
        now = datetime.utcnow()
        assignment1_c1 = Assignment(
            course_id=course1.id,
            title="AI Essay",
            description="Write a short essay on AI in education.",
            rubric="Clarity, depth, and originality.",
            due_date=now + timedelta(days=7),
        )
        assignment2_c1 = Assignment(
            course_id=course1.id,
            title="ML Quiz",
            description="Multiple-choice quiz on supervised learning.",
            rubric="Correctness of answers.",
            due_date=now + timedelta(days=10),
        )
        assignment1_c2 = Assignment(
            course_id=course2.id,
            title="SQL Project",
            description="Design a small relational schema and queries.",
            rubric="Schema design and query correctness.",
            due_date=now + timedelta(days=14),
        )

        session.add_all([assignment1_c1, assignment2_c1, assignment1_c2])
        await session.flush()

        # ---------- Submissions ----------
        submission1 = Submission(
            assignment_id=assignment1_c1.id,
            student_id=student1.id,
            content="AI can transform education through personalization...",
            ai_grade=88.5,
            ai_feedback="Good coverage of key points, could use more examples.",
            final_grade=90.0,
            status=SubmissionStatus.APPROVED,
            submitted_at=now - timedelta(days=1),
            graded_at=now,
        )
        submission2 = Submission(
            assignment_id=assignment1_c1.id,
            student_id=student2.id,
            content="My thoughts on AI in education...",
            ai_grade=72.0,
            ai_feedback="Some sections are shallow, expand on pros/cons.",
            final_grade=75.0,
            status=SubmissionStatus.APPROVED,
            submitted_at=now - timedelta(days=1),
            graded_at=now,
        )
        submission3 = Submission(
            assignment_id=assignment1_c2.id,
            student_id=student1.id,
            content="SQL schema for an online bookstore...",
            status=SubmissionStatus.PENDING_REVIEW,
            submitted_at=now,
        )

        session.add_all([submission1, submission2, submission3])

        # ---------- Attendance ----------
        attendance_records = [
            Attendance(
                lesson_id=lesson1.id,
                student_id=student1.id,
                present=True,
                marked_at=now - timedelta(days=2),
            ),
            Attendance(
                lesson_id=lesson1.id,
                student_id=student2.id,
                present=False,
                marked_at=now - timedelta(days=2),
            ),
            Attendance(
                lesson_id=lesson2.id,
                student_id=student1.id,
                present=True,
                marked_at=now - timedelta(days=1),
            ),
            Attendance(
                lesson_id=lesson2.id,
                student_id=student3.id,
                present=True,
                marked_at=now - timedelta(days=1),
            ),
        ]
        session.add_all(attendance_records)

        # ---------- Documents ----------
        doc1 = Document(
            course_id=course1.id,
            title="Course Syllabus",
            file_name="ai_syllabus.pdf",
            file_type="application/pdf",
            size=123456,
            file_url="https://example.com/mock/ai_syllabus.pdf",
            content_text="Week 1: Introduction to AI\nWeek 2: Search\n...",
        )
        doc2 = Document(
            course_id=course2.id,
            title="Database Design Slides",
            file_name="db_design.pdf",
            file_type="application/pdf",
            size=234567,
            file_url="https://example.com/mock/db_design.pdf",
            content_text="ER modeling, normalization, indexing...",
        )
        session.add_all([doc1, doc2])

        # ---------- Chat History ----------
        chat1 = ChatHistory(
            course_id=course1.id,
            student_id=student1.id,
            message="Can you explain the difference between AI and ML?",
            response="AI is the broader field; ML is a subset focused on learning from data.",
        )
        chat2 = ChatHistory(
            course_id=course1.id,
            student_id=student2.id,
            message="Any tips for the AI essay?",
            response="Focus on one area (e.g., education) and provide concrete examples.",
        )
        session.add_all([chat1, chat2])

        await session.commit()
        print("✅ Database seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())