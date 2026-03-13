from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, courses, modules, assignments, submissions, attendance, ai

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(courses.router)
api_router.include_router(modules.router)
api_router.include_router(modules.lessons_router)
api_router.include_router(assignments.router)
api_router.include_router(submissions.router)
api_router.include_router(attendance.router)
api_router.include_router(ai.router)
api_router.include_router(ai.grading_router)
