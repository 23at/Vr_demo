from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..auth.auth_handler import get_current_active_user
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import TrainingModule, UserModule, Progress, Scenario, TrainingSession, Role
from ..schemas import ProgressStatus, SessionStatus, ModuleCreate
from uuid import uuid4
router = APIRouter()

#request
class LaunchRequest(BaseModel):
    module_id:int

@router.post("/modules")
def create_module(
    module_data: ModuleCreate,
    db: Session=Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    new_module=TrainingModule(
        module_id=str(uuid4()),
        module_name=module_data.module_name,
        version=module_data.version,
        cdn_url=module_data.cdn_url,
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module    

@router.get("/modules")
def get_modules(
    db: Session= Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role == Role.ADMIN :
        modules=db.query(TrainingModule).all()
    else:
        modules = (
        db.query(TrainingModule)
        .join(UserModule, UserModule.module_id == TrainingModule.module_id)
        .filter(UserModule.user_id == current_user.user_id)
        .all()
    )

    return modules

@router.get("/modules/{module_id}")
def get_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):

    module = db.query(TrainingModule).filter(TrainingModule.module_id == module_id).first()

    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    return module


@router.post("/launch-module")
def launch_module(
    request: LaunchRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    module = db.query(TrainingModule).filter(TrainingModule.module_id == request.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # find progress
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.user_id,
        Progress.module_id == request.module_id
    ).first()

    if not progress:
        progress = Progress(
            user_id=current_user.user_id,
            module_id=request.module_id,
            status=ProgressStatus.IN_PROGRESS
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

     #determine scenario
    scenario = db.query(Scenario).filter(
        Scenario.module_id == request.module_id,
        Scenario.scenario_index == progress.current_scenario_index
    ).first()


    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    #find next session index
    last_session = db.query(TrainingSession).filter(
    TrainingSession.progress_id == progress.progress_id,
    TrainingSession.scenario_id == scenario.scenario_id
).order_by(TrainingSession.session_index.desc()).first()
    
    session_index = 0 if not last_session else last_session.session_index + 1
    # create session token
    session_token = str(uuid4())

    training_session = TrainingSession(
        progress_id=progress.progress_id,
        scenario_id=scenario.scenario_id,
        session_index=session_index,
        session_token=session_token,
        session_status=SessionStatus.IN_PROGRESS
    )

    db.add(training_session)
    db.commit()

    return {
        "module_id": module.module_id,
        "scenario_id": scenario.scenario_id,
        "session_token": session_token
    }