from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, users, mods

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploaded_modules", StaticFiles(directory="uploaded_modules"), name="modules")
app.include_router(auth.router, prefix="/auth")

app.include_router(users.router)
app.include_router(mods.router)


@app.get("/")
async def root():
    return {"message": "FastAPI app is running!"}
# Logout (frontend handles token deletion)
@app.post("/logout")
def logout():
    return {"message": "Logout handled on client by deleting token"}


    
