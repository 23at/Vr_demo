from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.auth_handler import get_current_active_user
from ..database import get_db
from ..models import Progress, TrainingModule, User
from ..schemas import ProgressStatus

router = APIRouter()

@router.post("/progress/update")
def update_progress(
    module_id: str,
    current_scenario_index: int,
    total_score: int,
    status: ProgressStatus = ProgressStatus.INPROGRESS,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    module = db.query(TrainingModule).filter(TrainingModule.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    progress = db.query(Progress).filter(
        Progress.user_id == current_user.user_id,
        Progress.module_id == module_id
    ).first()

    if not progress:
        progress = Progress(
            user_id=current_user.user_id,
            module_id=module_id,
            current_scenario_index=current_scenario_index,
            total_score=total_score,
            status=status,
            last_saved=datetime.utcnow()
        )
        db.add(progress)
    else:
        progress.current_scenario_index = current_scenario_index
        progress.total_score = total_score
        progress.status = status
        progress.last_saved = datetime.utcnow()

    db.commit()
    db.refresh(progress)
    return progress


@router.get("/progress/me")
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.user_id
    ).all()
    return progress
