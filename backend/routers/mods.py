from datetime import datetime
import hashlib
from sys import modules
from unittest import result
from botocore.client import Config
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from pydantic import BaseModel
from ..auth.auth_handler import get_current_active_user
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import TrainingModule,User, UserModule, Progress, Scenario, TrainingSession, Role
from ..schemas import ProgressStatus, SessionStatus, ModuleCreate, ScenarioCreate,ScenarioUpdate
from uuid import uuid4
import boto3
import os


router = APIRouter()

#request
class LaunchRequest(BaseModel):
    module_id:str

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")  
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")

# Cloudflare R2 client
s3 = boto3.client(
    "s3",
   endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4")
)
BUCKET_NAME = "training-modules"

CHUNK_SIZE= 10 *1024 * 1024
MULTIPART_THRESHOLD=50 * 1024*1024

def bump_patch_version(version: str) -> str:
    parts = version.split(".")
    if len(parts) != 3:
        return "1.0.0"

    major, minor, patch = parts
    return f"{int(major)}.{int(minor)}.{int(patch) + 1}"

@router.post("/modules/{module_id}/upload")
async def upload_module_file(
    module_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Only admins allowed
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch the module
    module = db.query(TrainingModule).filter(TrainingModule.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")


    r2_key = f"{file.filename}"
    hasher = hashlib.sha256()
    upload_id = None

    try:
        first_chunk= await file.read(CHUNK_SIZE)
        if not first_chunk:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        hasher.update(first_chunk)
        next_chunk = await file.read(CHUNK_SIZE)

        if not next_chunk:
            #Entire file fit in the first read
            s3.put_object(Bucket=BUCKET_NAME, Key=r2_key, Body=first_chunk)
            checksum=hasher.hexdigest()
        else:
            #large file multipart upload
            mpu =s3.create_multipart_upload(Bucket=BUCKET_NAME, Key=r2_key)
            upload_id=mpu["UploadId"]
            parts=[]
            part_number =1

            for chunk in (first_chunk, next_chunk):
                hasher.update(chunk)
                resp = s3.upload_part(
                    Bucket=BUCKET_NAME,
                    Key=r2_key,
                    UploadId=upload_id,
                    PartNumber=part_number,
                    Body=chunk,
                )
                parts.append({"PartNumber": part_number, "ETag": resp["ETag"]})
                part_number += 1

            #stream remainder
            while True:
                chunk=await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                hasher.update(chunk)
                resp=s3.upload_part(
                    Bucket=BUCKET_NAME,
                    Key=r2_key,
                    UploadId=upload_id,
                    PartNumber=part_number,
                    Body=chunk,
                )
                parts.append({"PartNumber": part_number, "ETag": resp["ETag"]})
                part_number += 1
            
            #finalize the mulitpart upload
            s3.complete_multipart_upload(
                Bucket=BUCKET_NAME,
                Key=r2_key,
                UploadId=upload_id,
                MultipartUpload={"Parts": parts},
            )
            upload_id=None
            checksum=hasher.hexdigest()
    except Exception as exc:
        if upload_id:
            try:
                s3.abort_multipart_upload(
                    Bucket=BUCKET_NAME, Key=r2_key, UploadId=upload_id
                )
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc
    
    module.r2_key = r2_key
    module.cdn_checksum = checksum

    module.version = bump_patch_version(module.version or "1.0.0")

    db.commit()

    return {
        "success": True,
        "module_id": module_id,
        "r2_key": r2_key,
        "cdn_checksum": checksum.capitalize,
        "version": module.version,
    }


@router.get("/modules/{module_id}/signed-url")
def get_signed_url(module_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
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
    db: Session=Depends(get_db),
    current_user = Depends(get_current_active_user)
):
     # Only admins allowed
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(TrainingModule).filter(
        TrainingModule.module_name == module_data.module_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Module with this name already exists"
        )
    new_module=TrainingModule(
        module_id=str(uuid4()),
        module_name=module_data.module_name,
        version=module_data.version,
        description=module_data.description,
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

    result = []

    for m in modules:
        progress = db.query(Progress).filter(
            Progress.user_id == current_user.user_id,
            Progress.module_id == m.module_id
        ).first()

        if progress and progress.status == ProgressStatus.COMPLETED:
            status = "Completed"
            progress_pct = 100
        elif progress:
            total = db.query(Scenario).filter(
                Scenario.module_id == m.module_id
            ).count()
            progress_pct = round((progress.current_scenario_index / total) * 100) if total else 0
            status = "Incomplete"
        else:
            status = "Incomplete"
            progress_pct = 0


        result.append({
            "module_id": m.module_id,
            "module_name": m.module_name,
            "version": m.version,
            "status": status,
            "progress_pct": progress_pct
        })

    return result

@router.get("/modules/{module_id}")
def get_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
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
    # Verify module exists
    module = db.query(TrainingModule).filter(
        TrainingModule.module_id == request.module_id
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Verify user is assigned to this module
    assignment = db.query(UserModule).filter(
        UserModule.user_id == current_user.user_id,
        UserModule.module_id == request.module_id
    ).first()
    if not assignment or not assignment.can_access():
        raise HTTPException(status_code=403, detail="Access to this module is not permitted")

    # Get or create progress
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
        db.flush()  # get progress_id without full commit

    # Guard: don't launch if already completed
    if progress.status == ProgressStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Module already completed")

    # Determine current scenario
    scenario = db.query(Scenario).filter(
        Scenario.module_id == request.module_id,
        Scenario.scenario_index == progress.current_scenario_index
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="No scenario found for current progress index")

    
    stale_session = db.query(TrainingSession).filter(
        TrainingSession.progress_id == progress.progress_id,
        TrainingSession.scenario_id == scenario.scenario_id,
        TrainingSession.session_status == SessionStatus.INPROGRESS
    ).first()
 
    if stale_session:
        stale_session.session_status = SessionStatus.FAILED
        db.flush()
        
    # Determine next session index for this scenario
    last_session = db.query(TrainingSession).filter(
        TrainingSession.progress_id == progress.progress_id,
        TrainingSession.scenario_id == scenario.scenario_id
    ).order_by(TrainingSession.session_index.desc()).first()

    session_index = 0 if not last_session else last_session.session_index + 1

    # Create session
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

#FIX: module_id corrected from int to str to match TrainingModule model
@router.post("/modules/{module_id}/scenarios")
def create_scenario(
    module_id: str,
    scenario: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if module exists
    module = db.query(TrainingModule).filter(TrainingModule.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Check for duplicate scenario_index within this module
    existing_index = db.query(Scenario).filter(
        Scenario.module_id == module_id,
        Scenario.scenario_index == scenario.scenario_index
    ).first()
    if existing_index:
        raise HTTPException(
            status_code=400,
            detail=f"Scenario index {scenario.scenario_index} already exists in this module"
        )
    
    # Create scenario
    new_scenario = Scenario(
        name=scenario.name,
        module_id=module_id,
        scenario_index=scenario.scenario_index
    )

    db.add(new_scenario)
    db.commit()
    db.refresh(new_scenario)

    return new_scenario

#FIX: module_id corrected from int to str to match TrainingModule model
@router.get("/modules/{module_id}/scenarios")
def get_scenarios_by_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    scenarios = db.query(Scenario).filter(Scenario.module_id == module_id).all()
    return scenarios

@router.put("/scenarios/{scenario_id}")
def update_scenario(
    scenario_id: int,
    updated_data: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    scenario = db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()

    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Check for duplicate index among other scenarios in the same module
    if updated_data.scenario_index is not None:
        duplicate = db.query(Scenario).filter(
            Scenario.module_id == scenario.module_id,
            Scenario.scenario_index == updated_data.scenario_index,
            Scenario.scenario_id != scenario_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail=f"Scenario index {updated_data.scenario_index} already exists in this module"
            )
        scenario.scenario_index = updated_data.scenario_index
 
    if updated_data.name is not None:
        scenario.name = updated_data.name
 
    db.commit()
    db.refresh(scenario)
 
    return scenario

@router.delete("/scenarios/{scenario_id}")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    scenario = db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()

    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    db.delete(scenario)
    db.commit()

    return {"message": "Scenario deleted successfully"}