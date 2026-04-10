import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from backend.main import app
from backend.database import Base, get_db
from backend.auth.auth_handler import get_current_active_user
from backend.models import TrainingModule, Scenario, UserModule, Progress
from backend.schemas import Role, ProgressStatus, AccessLevel


# TEST DB

TEST_DB = "test.db"

SQLALCHEMY_DATABASE_URL = f"sqlite:///./{TEST_DB}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# DB FIXTURE

@pytest.fixture(scope="function")
def db():
     # reset tables instead of deleting file
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# DB OVERRIDE

def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# TEST CLIENT

@pytest.fixture
def client(db):
    return TestClient(app)



# MOCK USER

class MockUser:
    def __init__(self, role):
        self.role = role
        self.user_id = 1


def override_get_current_user_admin():
    return MockUser(Role.ADMIN)


def override_get_current_user_user():
    return MockUser(Role.USER)



# MOCK S3

class FakeS3:
    def put_object(self, Bucket, Key, Body):
        return {"ETag": "test-etag"}

    def create_multipart_upload(self, Bucket, Key):
        return {"UploadId": "123"}

    def upload_part(self, Bucket, Key, UploadId, PartNumber, Body):
        return {"ETag": f"etag-{PartNumber}"}

    def complete_multipart_upload(self, Bucket, Key, UploadId, MultipartUpload):
        return {"status": "ok"}

    def abort_multipart_upload(self, Bucket, Key, UploadId):
        return {"aborted": True}

    def generate_presigned_url(self, *args, **kwargs):
        return "http://signed-url"

import backend.routers.mods as modules_router
modules_router.s3 = FakeS3()
modules_router.BUCKET_NAME = "test-bucket"


# FIXTURES

@pytest.fixture
def test_module(db):
    module = TrainingModule(
        module_id="hbd0408",
        module_name="Test Module",
        version="1.0",
        description="Test",
        r2_key="file.zip",             
        cdn_checksum="abc123"  
    )        
    db.add(module)
    db.commit()
    return module

@pytest.fixture
def test_scenarios(db, test_module):
    scenario1 = Scenario(
        module_id=test_module.module_id,
        name="Scenario 0",
        scenario_index=0
    )
    scenario2 = Scenario(
        module_id=test_module.module_id,
        name="Scenario 1",
        scenario_index=1
    )

    db.add_all([scenario1, scenario2])
    db.commit()

    return [scenario1, scenario2]

@pytest.fixture
def test_progress(db, test_module):
    progress = Progress(
        user_id=1,
        module_id=test_module.module_id,
        status=ProgressStatus.INPROGRESS,
        current_scenario_index=0,
        total_score=0
    )

    db.add(progress)
    db.commit()
    db.refresh(progress)

    return progress

@pytest.fixture
def test_assignment(db, test_module):
    assignment = UserModule(
        user_id=1,
        module_id=test_module.module_id,
        access_level=AccessLevel.FULL
    )
    db.add(assignment)
    db.commit()
    return assignment



# TESTS


def test_create_module(client):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_admin

    payload = {
        "module_id":"hbd0408",
        "module_name": "New Module",
        "version": "1.0",
        "description": "desc is this",
        "r2_key": "file.zip",
        "cdn_checksum": "abc123"
    }

    response = client.post("/modules", json=payload)

    assert response.status_code == 200
    assert response.json()["module_name"] == "New Module"


def test_get_modules_admin(client):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_user

    response = client.get("/modules/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_module_user(client, test_module):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_admin

    response = client.get("/modules/")
    data= response.json()
    assert response.status_code == 200
    assert data[0]["module_id"]==test_module.module_id

def test_signed_url(client, test_module):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_admin

    response = client.get(f"/modules/{test_module.module_id}/signed-url")

    assert response.status_code == 200
    assert "signed_url" in response.json()


def test_launch_module_success(client, test_module, test_scenarios):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_user

    response = client.post("/launch-module", json={"module_id": test_module.module_id})

    assert response.status_code == 200
    data = response.json()
    assert "session_token" in data
    assert data["module_id"] == test_module.module_id
    # Make sure Unity gets everything it needs to load
    assert "current_scenario" in data
    assert data["current_scenario"]["scenario_index"] == 0
    assert data["total_score"] == 0
    assert "progress_pct" in data

def test_launch_module_creates_progress(client, db, test_module, test_scenarios):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_user

    client.post("/launch-module", json={"module_id": test_module.module_id})

    progress = db.query(Progress).filter(
        Progress.user_id == 1,
        Progress.module_id == test_module.module_id
    ).first()
    assert progress is not None
    assert progress.current_scenario_index == 0
    assert progress.total_score == 0

def test_launch_module_resumes_existing_progress(client, db, test_module, test_scenarios, test_progress):
    # Manually advance progress to scenario 1
    test_progress.current_scenario_index = 1
    test_progress.total_score = 15
    db.commit()

    app.dependency_overrides[get_current_active_user] = override_get_current_user_user

    response = client.post("/launch-module", json={"module_id": test_module.module_id})

    assert response.status_code == 200
    data = response.json()
    # Should resume at scenario 1, not reset to 0
    assert data["current_scenario"]["scenario_index"] == 1
    assert data["total_score"] == 15



def test_upload_module_file(client, test_module):
    app.dependency_overrides[get_current_active_user] = override_get_current_user_admin

    file_content = b"hello world"

    response = client.post(
        f"/modules/{test_module.module_id}/upload",
        files={"file": ("test.txt", file_content, "text/plain")}
    )

    assert response.status_code == 200
    assert response.json()["module_id"] == test_module.module_id