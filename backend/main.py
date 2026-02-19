from fastapi import FastAPI, Request, Depends,HTTPException
from starlette.middleware.sessions import SessionMiddleware

from .schemas import LoginRequest, ModuleResponse, ModuleCreate
from .database import Base, engine, get_db
from sqlalchemy.orm import Session
from .models import User, Module
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="supersecret")

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Create tables
Base.metadata.create_all(bind=engine)

# Register route in main.py
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    # truncate to 72 characters to avoid bcrypt crash
    return pwd_context.hash(password[:72])

@app.post("/register")
def register(user: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": f"User {db_user.username} created successfully"}


def get_user(db: Session, username: str):
    db_user = db.query(User).filter(User.username == username).first()
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

@app.post("/login")
def login(request: Request, login: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login.username, login.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user_id"] = user.id
    return {"message": f"Logged in as {user.username}"}

@app.post("/logout")
def logout(request: Request):
    if "user_id" in request.session:
        # Remove the user from session
        request.session.pop("user_id")
        return {"message": "Logged out successfully"}
    
@app.get("/protected")
def protected(request: Request):
    if "user_id" not in request.session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"message": "You are authenticated"}


@app.post("/modules", response_model=ModuleResponse)
def create_module(module: ModuleCreate,request: Request,db: Session = Depends(get_db)):
    if "user_id" not in request.session:
        raise HTTPException(status_code=401, detail="You must be logged in to create a module")
    
    db_module = Module(title=module.title, description=module.description)
    db.add(db_module)
    db.commit()
    db.refresh(db_module)
    return db_module

@app.get("/modules", response_model=list[ModuleResponse])
def list_modules(request: Request, db: Session = Depends(get_db)):
    if "user_id" not in request.session:
        raise HTTPException(status_code=401, detail="You must be logged in to create a module")
    
    return db.query(Module).all()

@app.get("/modules/{module_id}", response_model=ModuleResponse)
def get_module(module_id: int,request: Request ,db: Session = Depends(get_db)):
    if "user_id" not in request.session:
        raise HTTPException(status_code=401, detail="You must be logged in to create a module")
    
    mod = db.query(Module).filter(Module.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    return mod

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)