from fastapi import APIRouter, Depends, HTTPException

from ..auth.auth_handler import get_current_active_user, get_password_hash
from ..database import get_db

from ..schemas import UserResponse, UserCreate, Session, UserUpdate
from ..models import User

router = APIRouter()

@router.get("/users/me/", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, updates: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.email:
        user.email = updates.email
    if updates.name:
        user.name = updates.name
    if updates.password:
        user.hashed_password = get_password_hash(updates.password)

    db.commit()
    db.refresh(user)

    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}