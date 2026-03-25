from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserModule, TrainingModule, Role
from ..auth.auth_handler import get_current_active_user

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user):
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# GET ALL USERS + THEIR MODULES
@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    require_admin(current_user)

    users = db.query(User).all()

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