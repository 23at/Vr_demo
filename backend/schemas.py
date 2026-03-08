from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr
import enum

#enums
class Role(enum.Enum):
    ADMIN="ADMIN"
    USER="USER"

class ProgressStatus(enum.Enum):
    COMPLETED="COMPLETED"
    INCOMPLETED="INCOMPLETED"
    INPROGRESS="INPROGRESS"

class SessionStatus(enum.Enum):
    COMPLETED="COMPLETED"
    INCOMPLETED="INCOMPLETED"
    FAILED="FAILED"

#user schemas

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Role= Role.USER

class UserResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    user_id:int
    username: str
    email: EmailStr | None = None
    first_name:str|None=None
    last_name:str |None=None
    role: Role | None=None

class UserInDB(UserResponse):
    hashed_password: str

class LoginRequest(BaseModel):
    username: str
    password: str

#models schemas
class ModuleCreate(BaseModel):
    title: str
    description: str | None = None
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


class ScenarioUpdate(BaseModel):
    name: str | None = None


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
    session_status: SessionStatus = SessionStatus.INCOMPLETED
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
    session_status: str | None = None
    session_index: int
    score: float | None = None
    total_duration: float | None = None

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
