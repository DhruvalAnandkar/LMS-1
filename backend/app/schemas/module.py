from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class ModuleResponse(ModuleBase):
    id: int
    course_id: int
    created_at: datetime
    lessons: list["LessonResponse"] = []

    class Config:
        from_attributes = True


class LessonBase(BaseModel):
    title: str
    content: Optional[str] = None
    order: int = 0


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None


class LessonResponse(LessonBase):
    id: int
    module_id: int
    created_at: datetime

    class Config:
        from_attributes = True


ModuleResponse.model_rebuild()
