import uuid
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.auth.auth_handler import get_password_hash
from backend.database import Base, get_db
from backend.main import app
from backend.models import Progress, Scenario, TrainingModule, TrainingSession, User, UserModule
from backend.schemas import AccessLevel, ProgressStatus, Role, SessionStatus


@pytest.fixture(scope="function")
def db(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    Base.metadata.create_all(bind=engine)
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    def factory(
        username=None,
        email=None,
        password="secret123",
        role=Role.USER,
        first_name=None,
        last_name=None,
    ):
        user = User(
            username=username or f"user_{uuid.uuid4().hex[:8]}",
            email=email or f"{uuid.uuid4().hex[:8]}@test.com",
            first_name=first_name,
            last_name=last_name,
            password_hash=get_password_hash(password),
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return factory


@pytest.fixture
def make_module(db):
    def factory(
        module_id=None,
        module_name=None,
        version="1.0.0",
        description="Test module",
        r2_key="module.zip",
        cdn_checksum="checksum123",
    ):
        module = TrainingModule(
            module_id=module_id or uuid.uuid4().hex,
            module_name=module_name or f"Module {uuid.uuid4().hex[:8]}",
            version=version,
            description=description,
            r2_key=r2_key,
            cdn_checksum=cdn_checksum,
        )
        db.add(module)
        db.commit()
        db.refresh(module)
        return module

    return factory


@pytest.fixture
def make_scenario(db):
    def factory(module_id, scenario_index, name=None):
        scenario = Scenario(
            module_id=module_id,
            scenario_index=scenario_index,
            name=name or f"Scenario {scenario_index}",
        )
        db.add(scenario)
        db.commit()
        db.refresh(scenario)
        return scenario

    return factory


@pytest.fixture
def make_assignment(db):
    def factory(user_id, module_id, access_level=AccessLevel.FULL, assigned_by=None):
        assignment = UserModule(
            user_id=user_id,
            module_id=module_id,
            access_level=access_level,
            assigned_by=assigned_by,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    return factory


@pytest.fixture
def make_progress(db):
    def factory(
        user_id,
        module_id,
        status=ProgressStatus.INPROGRESS,
        current_scenario_index=0,
        total_score=0,
    ):
        progress = Progress(
            user_id=user_id,
            module_id=module_id,
            status=status,
            current_scenario_index=current_scenario_index,
            total_score=total_score,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
        return progress

    return factory


@pytest.fixture
def make_session(db):
    def factory(
        progress_id,
        scenario_id,
        session_index=0,
        session_status=SessionStatus.INPROGRESS,
        session_token=None,
    ):
        session = TrainingSession(
            progress_id=progress_id,
            scenario_id=scenario_id,
            session_index=session_index,
            session_status=session_status,
            session_token=session_token or str(uuid.uuid4()),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    return factory


@pytest.fixture
def current_user_override():
    def factory(user):
        def override():
            return user

        return override

    return factory
