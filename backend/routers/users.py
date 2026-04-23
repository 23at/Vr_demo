from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.auth_handler import get_current_active_user, get_password_hash
from ..database import get_db
from ..schemas import UserResponse, UserCreate, UserUpdate
from ..models import User

router = APIRouter()


@router.get("/users/me/", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
