from fastapi import APIRouter, Depends, HTTPException, status
import secrets
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.token import Token
from app.schemas.user import UserResponse, PasswordReset
from app.services import user as user_service
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    verify_password,
    hash_token,
    validate_password,
)
from app.core.rate_limit import rate_limiter
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(rate_limiter(10, 60)),
):
    user = await user_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    await user_service.update_refresh_token(db, user.id, refresh_token)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(rate_limiter(10, 60)),
):
    token_data = decode_token(refresh_token)
    if token_data.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user = await user_service.get_user_by_id(db, int(token_data.user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    refresh_hash = hash_token(refresh_token)
    if not user.refresh_token_hash or not secrets.compare_digest(user.refresh_token_hash, refresh_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    await user_service.update_refresh_token(db, user.id, new_refresh_token)
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/reset-password", response_model=UserResponse)
async def reset_password(
    password_data: PasswordReset,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(rate_limiter(5, 60)),
):
    validate_password(password_data.new_password)
    if current_user.requires_password_reset:
        if password_data.current_password:
            user = await user_service.get_user_by_id(db, current_user.id)
            if not verify_password(password_data.current_password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect"
                )
    else:
        if not password_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required"
            )
        user = await user_service.get_user_by_id(db, current_user.id)
        if not verify_password(password_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
    
    updated_user = await user_service.update_password(db, current_user.id, password_data.new_password)
    return updated_user
