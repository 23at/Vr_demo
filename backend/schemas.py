from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    username: str
    email: str | None = None

class UserInDB(UserResponse):
    hashed_password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ModuleCreate(BaseModel):
    title: str
    description: str | None = None
    scene_name:str



class ModuleResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    is_active: bool
    scene_name:str
    class Config:
        orm_mode = True