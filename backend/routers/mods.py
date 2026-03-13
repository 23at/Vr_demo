from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..auth.auth_handler import get_current_active_user
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import TrainingModule

router = APIRouter()

#request
class LaunchRequest(BaseModel):
    module_id:str

@router.get("/modules")
def get_modules(
    db: Session= Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    modules=db.query(TrainingModule).all()
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
    
    return {
        "module_id": module.module_id,
        "name": module.name,
        "version": module.version
    }