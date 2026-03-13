from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.module import Module, Lesson
from app.schemas.module import ModuleCreate, ModuleUpdate, LessonCreate, LessonUpdate


async def get_module_by_id(db: AsyncSession, module_id: int) -> Optional[Module]:
    result = await db.execute(
        select(Module).options(selectinload(Module.lessons)).where(Module.id == module_id)
    )
    return result.scalars().first()


async def get_modules_by_course(db: AsyncSession, course_id: int) -> List[Module]:
    result = await db.execute(
        select(Module)
        .options(selectinload(Module.lessons))
        .where(Module.course_id == course_id)
        .order_by(Module.order)
    )
    return list(result.scalars().all())


async def create_module(db: AsyncSession, course_id: int, module: ModuleCreate) -> Module:
    db_module = Module(
        title=module.title,
        description=module.description,
        order=module.order,
        course_id=course_id,
    )
    db.add(db_module)
    await db.flush()
    await db.refresh(db_module)
    return db_module


async def update_module(db: AsyncSession, module_id: int, module_update: ModuleUpdate) -> Optional[Module]:
    db_module = await get_module_by_id(db, module_id)
    if not db_module:
        return None
    
    update_data = module_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_module, field, value)
    
    await db.flush()
    await db.refresh(db_module)
    return db_module


async def delete_module(db: AsyncSession, module_id: int) -> bool:
    db_module = await get_module_by_id(db, module_id)
    if not db_module:
        return False
    await db.delete(db_module)
    await db.flush()
    return True


async def get_lesson_by_id(db: AsyncSession, lesson_id: int) -> Optional[Lesson]:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    return result.scalars().first()


async def create_lesson(db: AsyncSession, module_id: int, lesson: LessonCreate) -> Lesson:
    db_lesson = Lesson(
        title=lesson.title,
        content=lesson.content,
        order=lesson.order,
        module_id=module_id,
    )
    db.add(db_lesson)
    await db.flush()
    await db.refresh(db_lesson)
    return db_lesson


async def update_lesson(db: AsyncSession, lesson_id: int, lesson_update: LessonUpdate) -> Optional[Lesson]:
    db_lesson = await get_lesson_by_id(db, lesson_id)
    if not db_lesson:
        return None
    
    update_data = lesson_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_lesson, field, value)
    
    await db.flush()
    await db.refresh(db_lesson)
    return db_lesson


async def delete_lesson(db: AsyncSession, lesson_id: int) -> bool:
    db_lesson = await get_lesson_by_id(db, lesson_id)
    if not db_lesson:
        return False
    await db.delete(db_lesson)
    await db.flush()
    return True


async def get_all_lessons_by_course(db: AsyncSession, course_id: int) -> List[Lesson]:
    result = await db.execute(
        select(Lesson)
        .join(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order, Lesson.order)
    )
    return list(result.scalars().all())
