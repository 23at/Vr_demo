import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from backend.main import app
from backend.database import Base, get_db
from backend.auth.auth_handler import get_current_active_user
from backend.models import TrainingModule, Scenario, Progress, TrainingSession
from backend.schemas import Role, ProgressStatus, SessionStatus, AccessLevel

# TEST DB

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client(db):
    return TestClient(app)


# MOCK USERS

class MockUser:
    def __init__(self, role, user_id=1):
        self.role = role
        self.user_id = user_id


def mock_user():
    return MockUser(Role.USER, user_id=1)


def mock_other_user():
    """Different user — for ownership checks."""
    return MockUser(Role.USER, user_id=99)


# FIXTURES

@pytest.fixture
def setup(db):
    """One fixture that builds the full chain: module → scenarios → progress → session."""
    module = TrainingModule(
        module_id="mod001",
        module_name="Test Module",
        version="1.0",
        description="Test",
        r2_key="file.zip",
        cdn_checksum="abc123"
    )
    db.add(module)
    db.flush()

    s0 = Scenario(module_id="mod001", name="Scenario 0", scenario_index=0)
    s1 = Scenario(module_id="mod001", name="Scenario 1", scenario_index=1)
    db.add_all([s0, s1])
    db.flush()

    progress = Progress(
        user_id=1,
        module_id="mod001",
        status=ProgressStatus.INPROGRESS,
        current_scenario_index=0,
        total_score=0
    )
    db.add(progress)
    db.flush()

    session = TrainingSession(
        progress_id=progress.progress_id,
        scenario_id=s0.scenario_id,
        session_index=0,
        session_token=str(uuid.uuid4()),
        session_status=SessionStatus.INPROGRESS
    )
    db.add(session)
    db.commit()

    db.refresh(s0)
    db.refresh(s1)
    db.refresh(progress)
    db.refresh(session)

    return {"session": session, "progress": progress, "s0": s0, "s1": s1}


def post_progress(client, token, scenario_id, scenario_index, status, score_delta=0):
    """Helper to reduce boilerplate in every test."""
    return client.post(
        f"/api/sessions/{token}/progress",
        json={
            "scenario_id": scenario_id,
            "scenario_index": scenario_index,
            "status": status,
            "score_delta": score_delta
        }
    )

# TESTS


def test_complete_scenario_advances_index(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s0"].scenario_id,
        scenario_index=0,
        status="completed",
        score_delta=10
    )

    assert response.status_code == 200
    data = response.json()
    assert data["next_scenario"]["index"] == 1
    assert data["completed"] is False


def test_complete_scenario_adds_score(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s0"].scenario_id,
        scenario_index=0,
        status="completed",
        score_delta=25
    )

    assert response.status_code == 200
    assert response.json()["total_score"] == 25


def test_complete_last_scenario_marks_completed(client, db, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    # Advance to last scenario
    s["progress"].current_scenario_index = 1
    s["session"].scenario_id = s["s1"].scenario_id
    db.commit()

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s1"].scenario_id,
        scenario_index=1,
        status="completed",
        score_delta=10
    )

    assert response.status_code == 200
    data = response.json()
    assert data["completed"] is True
    assert data["next_scenario"] is None


def test_failed_scenario_stays_on_same_index(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s0"].scenario_id,
        scenario_index=0,
        status="failed"
    )

    assert response.status_code == 200
    # next_scenario should still be scenario 0
    assert response.json()["next_scenario"]["index"] == 0


def test_session_not_found_returns_404(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user

    response = post_progress(
        client,
        token="fake-token-xyz",
        scenario_id=1,
        scenario_index=0,
        status="completed"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


def test_wrong_user_returns_403(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_other_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s0"].scenario_id,
        scenario_index=0,
        status="completed"
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"


def test_invalid_scenario_returns_400(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=9999,           # doesn't exist
        scenario_index=0,
        status="completed"
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid scenario"


def test_out_of_order_scenario_returns_400(client, setup):
    app.dependency_overrides[get_current_active_user] = mock_user
    s = setup

    response = post_progress(
        client,
        token=s["session"].session_token,
        scenario_id=s["s1"].scenario_id,
        scenario_index=1,           # session is at index 0
        status="completed"
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid scenario order"