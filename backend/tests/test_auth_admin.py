import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import Base, get_db
from backend.models import User, TrainingModule, UserModule
from backend.auth.auth_handler import get_current_active_user
from backend.schemas import Role


# TEST DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)



# OVERRIDES

def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class MockUser:
    def __init__(self, role=Role.ADMIN):
        self.user_id = 1
        self.username = "testuser"
        self.email = "test@test.com"
        self.role = role


def override_admin_user():
    return MockUser(Role.ADMIN)

def override_normal_user():
    return MockUser(Role.USER)


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    return TestClient(app)


# FIXTURE: CLEAN DB

@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db):
    user = User(
        user_id=1,
        username="old_name",
        email="old@test.com",
        password_hash="hashed",
        role=Role.USER
    )
    db.add(user)
    db.commit()
    return user

# TEST DATA HELPERS

def create_user(db, user_id=1, role=Role.USER):
    user = User(
        user_id=user_id,
        username=f"user{user_id}",
        email=f"user{user_id}@test.com",
        password_hash="hashed",
        role=role
    )
    db.add(user)
    db.commit()
    return user


def create_module(db):
    module = TrainingModule(
        module_id="mod-1",
        module_name="Test Module",
        version="1.0",
        description="desc",
        r2_key="file.zip",
        cdn_checksum="abc123"
    )
    db.add(module)
    db.commit()
    return module



# AUTH TESTS

def test_register_user(client):
    response = client.post("/auth/register", json={
        "username": "john",
        "email": "john@test.com",
        "password": "1234",
        "role": "USER"
    })

    assert response.status_code == 200
    assert response.json()["username"] == "john"


def test_login_user(client):
    client.post("/auth/register", json={
        "username": "john",
        "email": "john@test.com",
        "password": "1234",
        "role": "USER"
    })

    response = client.post(
        "/auth/token",
        data={"username": "john", "password": "1234"}
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_get_me(client):
    app.dependency_overrides[get_current_active_user] = override_admin_user

    response = client.get("/users/me/")

    assert response.status_code == 200


# ADMIN USERS

def test_get_users(client):
    app.dependency_overrides[get_current_active_user] = override_admin_user

    response = client.get("/admin/users")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_user(client, test_user):
    app.dependency_overrides[get_current_active_user] = override_admin_user

    response = client.put(f"/admin/users/{test_user.user_id}", json={
        "username": "updated_name"
    })

    assert response.status_code == 200


def test_delete_user(client, test_user):
    app.dependency_overrides[get_current_active_user] = override_admin_user

    response = client.delete(f"/admin/users/{test_user.user_id}")

    assert response.status_code == 200


# MODULE ASSIGNMENT


def test_assign_module(client, test_user):
    app.dependency_overrides[get_current_active_user] = override_admin_user

    response = client.delete(f"/admin/users/{test_user.user_id}")

    assert response.status_code == 200
    assert "message" in response.json()