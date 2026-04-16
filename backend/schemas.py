from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr
import enum

#enums
class AccessLevel(enum.Enum):
    FULL = "full"
    READ_ONLY = "read-only"

class Role(enum.Enum):
    ADMIN="ADMIN"
    USER="USER"

class ProgressStatus(enum.Enum):
    COMPLETED="COMPLETED"
    INCOMPLETED="INCOMPLETED"
    INPROGRESS="INPROGRESS"

class SessionStatus(str,enum.Enum):
    COMPLETED="COMPLETED"
    NOT_STARTED = "NOT_STARTED"
    INPROGRESS="INPROGRESS"
    FAILED="FAILED"

#user schemas

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Role= Role.USER
    
class UserUpdate(BaseModel):
    username: Optional[str]=None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    user_id:int
    username: str
    email: EmailStr | None = None
    first_name:str|None=None
    last_name:str |None=None
    role:Role = Role.USER

class UserInDB(UserResponse):
    hashed_password: str

class LoginRequest(BaseModel):
    username: str
    password: str

#models schemas
class ModuleCreate(BaseModel):
    module_name: str
    description: str | None = None
    version:str
    is_active: bool = True


class ModuleUpdate(BaseModel):
    module_name: str | None = None
    description: str | None = None
    is_active: bool | None = None

class ModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module_name: str
    description: str | None = None
    is_active: bool

#sceanrios  
class ScenarioCreate(BaseModel):
    name: str
    module_id: int
    scenario_index: int



class ScenarioUpdate(BaseModel):
    name: str | None = None
    scenario_index: int


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario_id: int
    name: str
    module_id: int

#progress
class ProgressCreate(BaseModel):
    user_id: int
    module_id: int
    status: ProgressStatus = ProgressStatus.INPROGRESS
    current_scenario_index: int = 0
    total_score: float = 0.0


class ProgressUpdate(BaseModel):
    status: ProgressStatus | None = None
    current_scenario_index: int | None = None
    total_score: float | None = None


class ProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    progress_id: int
    user_id: int
    module_id: int
    status: str | None = None
    current_scenario_index: int = 0
    total_score: float = 0.0
    last_saved: datetime | None = None

#training sessions
class SessionCreate(BaseModel):
    progress_id: int
    scenario_id: int
    session_index: int
    session_token:str
    session_status: SessionStatus = SessionStatus.INPROGRESS
    score: float | None = None
    total_duration: float | None = None


class SessionUpdate(BaseModel):
    session_status: SessionStatus | None = None
    score: float | None = None
    total_duration: float | None = None
    end_time: datetime | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    progress_id: int
    scenario_id: int
    start_time: datetime | None = None
    end_time: datetime | None = None
    session_status: SessionStatus= SessionStatus.NOT_STARTED
    session_token: str | None=None
    session_index: int
    score: float | None = None
    total_duration: float | None = None

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
