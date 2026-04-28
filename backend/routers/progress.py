from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..models import TrainingSession, Progress, Scenario
from ..schemas import ProgressStatus
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth.auth_handler import get_current_active_user


router = APIRouter()


class ProgressRequest(BaseModel):
    scenario_index: int
    status: str
    score_delta: int = 0

@router.post("/api/sessions/{session_token}/progress")
async def update_progress(
    session_token: str,
    data: ProgressRequest, 
    db: Session = Depends(get_db),
    current_user=  Depends(get_current_active_user) 
    ):
    

    # 1. Validate session
    session = get_session(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    #get progress
    progress = db.query(Progress).filter(
        Progress.progress_id == session.progress_id
    ).first()

    if not progress or progress.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if progress.status == ProgressStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Module already completed")
                            
    # 2. Validate scenario 
    scenario = db.query(Scenario).filter(
    Scenario.scenario_index == data.scenario_index,
    Scenario.module_id == progress.module_id).first()

    if not scenario:
        raise HTTPException(status_code=400, detail="Invalid scenario")

    # 3. Validate order
    if data.scenario_index != progress.current_scenario_index:
        raise HTTPException(status_code=400, detail="Invalid scenario order")
    
    if data.scenario_index < progress.current_scenario_index:
        raise HTTPException(status_code=400, detail="Scenario already completed")
    
    # 4. Update progress
    if data.status == "completed":
        progress.current_scenario_index += 1
        progress.total_score += data.score_delta

    elif data.status == "failed":
    # stay on same scenario 
        pass

    # 5. Get next scenario
    next_scenario = get_next_scenario(db, progress.module_id, progress.current_scenario_index)
    
    if next_scenario is None:
        progress.status = ProgressStatus.COMPLETED
    else:
        progress.status = ProgressStatus.INPROGRESS

    db.add(progress)
    db.commit()
    db.refresh(progress)

    # 6. Calculate progress
    total_score=progress.total_score
    progress_pct = calculate_progress(db, progress.module_id, progress.current_scenario_index)

    return {
        "next_scenario": {
            "id": next_scenario.scenario_id,
            "name": next_scenario.name,
            "index": next_scenario.scenario_index
        } if next_scenario else None,
        "progress": progress_pct,
        "total_score":total_score,
        "completed": next_scenario is None
    }



def get_session(db, session_token: str):
    return db.query(TrainingSession).filter(
        TrainingSession.session_token == session_token
    ).first()

def get_next_scenario(db, module_id: str, next_index: int):
    return db.query(Scenario).filter(
        Scenario.module_id == module_id,
        Scenario.scenario_index == next_index
    ).first()


def calculate_progress(db, module_id: str, current_index: int):
    total = db.query(Scenario).filter(
        Scenario.module_id == module_id
    ).count()

    if total == 0:
        return 0

    return round((current_index / total) * 100)
