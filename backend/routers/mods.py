from datetime import datetime
import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile,Form
from fastapi import security
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from ..auth.auth_handler import get_current_active_user
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import TrainingModule,User, UserModule, Progress, Scenario, TrainingSession, Role
from ..schemas import ProgressStatus, SessionStatus, ModuleCreate
from uuid import uuid4
import boto3
import os


router = APIRouter()

#request
class LaunchRequest(BaseModel):
    module_id:str


# Cloudflare R2 client
s3 = boto3.client(
    "s3",
    region_name="auto",
    endpoint_url="https://<account-id>.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_KEY"],
    aws_secret_access_key=os.environ["R2_SECRET"],
)
BUCKET_NAME = "vr-modules"

@router.get("/modules/{module_id}/signed-url")
def get_signed_url(module_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    module = db.query(TrainingModule).filter(TrainingModule.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Generate signed URL valid for 10 minutes
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": module.r2_key},
        ExpiresIn=600  # seconds
    )

    return {"signed_url": url, "version": module.version, "checksum": module.cdn_checksum}

@router.post("/modules")
def create_module(
    module_data: ModuleCreate,
    db: Session=Depends(get_db)
):

    new_module=TrainingModule(
        module_id=str(uuid4()),
        module_name=module_data.module_name,
        version=module_data.version,
        r2_key=module_data.r2_key,
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

    signed_url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": module.r2_key,
        },
        ExpiresIn=600  # 10 minutes
    )
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
            status=ProgressStatus.INPROGRESS,
            current_scenario_index=0,
            total_score=0,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

     #determine scenario
    scenario = db.query(Scenario).filter(
        Scenario.module_id == request.module_id,
        Scenario.scenario_index == progress.current_scenario_index
    ).first()

    print("Request module_id:", request.module_id)
    print("Module found:", module)
    print("Progress:", progress)
    print("Scenario found:", scenario)
    print("Launch module request received:", request)
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
        session_status=SessionStatus.INPROGRESS
    )

    db.add(training_session)
    db.commit()

    return {
        "module_id": module.module_id,
        "scenario_id": scenario.scenario_id,
        "session_token": session_token
    }

