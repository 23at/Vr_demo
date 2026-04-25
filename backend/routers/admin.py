from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserModule, Role, Progress, Scenario
from ..schemas import UserUpdate, ProgressStatus
from ..auth.auth_handler import get_current_active_user
from ..auth.auth_handler import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user):
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# GET ALL USERS + THEIR MODULES WITH PROGRESS
@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    require_admin(current_user)

    users = db.query(User).filter(
        User.role != Role.ADMIN,
        User.user_id != current_user.user_id
    ).all()

    result = []
    for user in users:
        modules = []
        for um in user.assigned_modules:
            # Look up this user's progress for this module
            progress = db.query(Progress).filter(
                Progress.user_id == user.user_id,
                Progress.module_id == um.module.module_id
            ).first()

            if progress and progress.status == ProgressStatus.COMPLETED:
                status = "Completed"
                progress_pct = 100
            elif progress:
                total = db.query(Scenario).filter(
                    Scenario.module_id == um.module.module_id
                ).count()
                progress_pct = round((progress.current_scenario_index / total) * 100) if total else 0
                status = "In Progress"
            else:
                status = "Not Started"
                progress_pct = 0

            modules.append({
                "module_id": um.module.module_id,
                "module_name": um.module.module_name,
                "status": status,
                "progress_pct": progress_pct,
            })

        result.append({
            "user_id": user.user_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
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
        user.username = data.username
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