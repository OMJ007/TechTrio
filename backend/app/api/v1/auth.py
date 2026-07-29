"""Authentication API endpoints — register, login, and current-user resolution.

All endpoints are async and use the shared async-session dependency.
"""

from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db import get_session
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserRead

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ── Token extraction ─────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Dependencies ─────────────────────────────────────────────────────────
# NOTE: get_current_user MUST be defined before endpoints that use it,
# otherwise Python raises a NameError at module load time.

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Resolve the current authenticated user from a JWT bearer token.

    Decodes the token, extracts the ``sub`` claim (a user UUID), fetches
    the user from the database, and returns the ORM instance.

    Raises ``401 Unauthorized`` if the token is invalid, expired, or
    references a non-existent user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = UUID(user_id_str)
    except (JWTError, ValueError, AttributeError):
        raise credentials_exception

    result = await session.execute(
        select(User).where(User.id == user_id),
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> User:
    """Create a new user account.

    The password is hashed with bcrypt before storage.  Returns the
    newly created user (without the password hash).
    """
    # Check for existing user with the same email
    result = await session.execute(
        select(User).where(User.email == user_data.email),
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    hashed_pwd = await run_in_threadpool(hash_password, user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_pwd,
        monthly_income=user_data.monthly_income,
        risk_profile=user_data.risk_profile,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate user and return JWT",
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Token:
    """Exchange valid credentials for a bearer JWT.

    Uses the OAuth2 password-flow form fields (``username`` = email).
    """
    result = await session.execute(
        select(User).where(User.email == form_data.username),
    )
    user = result.scalar_one_or_none()

    is_valid_pwd = (
        await run_in_threadpool(verify_password, form_data.password, user.password_hash)
        if user is not None
        else False
    )

    if user is None or not is_valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return profile details for the currently authenticated user."""
    return current_user
