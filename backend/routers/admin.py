from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserModule, Role
from ..schemas import UserUpdate
from ..auth.auth_handler import get_current_active_user
from ..auth.auth_handler import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user):
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# GET ALL USERS + THEIR MODULES
@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    require_admin(current_user)

    users = db.query(User).filter(
    User.role != Role.ADMIN,              # exclude admins
    User.user_id != current_user.user_id  # exclude yourself
    ).all()

    result = []
    for user in users:
        modules = []
        for um in user.assigned_modules:
            modules.append({
                "module_id": um.module.module_id,
                "module_name": um.module.module_name,
            })

        result.append({
            "user_id": user.user_id,
            "username": user.username,
            "modules": modules
        })

    return result


# ASSIGN MODULE
@router.post("/assign")
def assign_module(
    user_id: int,
    module_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    require_admin(current_user)

    existing = db.query(UserModule).filter_by(
        user_id=user_id,
        module_id=module_id
    ).first()

    if existing:
        return {"message": "Already assigned"}

    new_assignment = UserModule(
        user_id=user_id,
        module_id=module_id,
        assigned_by=current_user.user_id
    )

    db.add(new_assignment)
    db.commit()

    return {"message": "Module assigned"}


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    require_admin(current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.username:
        user.username=data.username
    if data.email:
        user.email = data.email

    if data.name:
        user.username = data.name

    if data.password:
        user.password_hash = get_password_hash(data.password)


    db.commit()

    return {"message": "User updated"}





@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    require_admin(current_user)

    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted"}