from backend.auth.auth_handler import get_current_active_user
from backend.schemas import ProgressStatus, Role


def test_complete_scenario_advances_progress_and_keeps_inprogress(
    client,
    db,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="progress_user", email="progress@test.com", role=Role.USER)
    module = make_module(module_name="Progress Module")
    first = make_scenario(module.module_id, 0)
    make_scenario(module.module_id, 1)
    progress = make_progress(user.user_id, module.module_id, current_scenario_index=0, total_score=0)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 0, "status": "completed", "score_delta": 10},
    )

    db.refresh(progress)
    assert response.status_code == 200
    assert response.json()["completed"] is False
    assert progress.current_scenario_index == 1
    assert progress.total_score == 10
    assert progress.status == ProgressStatus.INPROGRESS


def test_complete_last_scenario_marks_completed(
    client,
    db,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="done_user", email="done@test.com", role=Role.USER)
    module = make_module(module_name="Done Module")
    first = make_scenario(module.module_id, 0)
    second = make_scenario(module.module_id, 1)
    progress = make_progress(
        user.user_id,
        module.module_id,
        current_scenario_index=1,
        total_score=5,
        status=ProgressStatus.INPROGRESS,
    )
    session = make_session(progress.progress_id, second.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 1, "status": "completed", "score_delta": 10},
    )

    db.refresh(progress)
    assert response.status_code == 200
    assert response.json()["completed"] is True
    assert response.json()["next_scenario"] is None
    assert progress.status == ProgressStatus.COMPLETED
    assert progress.current_scenario_index == 2


def test_failed_scenario_keeps_same_index(
    client,
    db,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="fail_user", email="fail@test.com", role=Role.USER)
    module = make_module(module_name="Fail Module")
    first = make_scenario(module.module_id, 0)
    make_scenario(module.module_id, 1)
    progress = make_progress(user.user_id, module.module_id)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 0, "status": "failed", "score_delta": 0},
    )

    db.refresh(progress)
    assert response.status_code == 200
    assert progress.current_scenario_index == 0
    assert progress.status == ProgressStatus.INPROGRESS


def test_progress_rejects_missing_session(client, make_user, current_user_override):
    user = make_user(username="missing_session", email="missing@test.com", role=Role.USER)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        "/api/sessions/fake-token/progress",
        json={"scenario_index": 0, "status": "completed", "score_delta": 10},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


def test_progress_rejects_wrong_user(
    client,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    owner = make_user(username="owner", email="owner@test.com", role=Role.USER)
    other = make_user(username="other", email="other@test.com", role=Role.USER)
    module = make_module(module_name="Owned Module")
    first = make_scenario(module.module_id, 0)
    progress = make_progress(owner.user_id, module.module_id)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(other)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 0, "status": "completed", "score_delta": 10},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"


def test_progress_rejects_completed_module(
    client,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="already_done", email="already_done@test.com", role=Role.USER)
    module = make_module(module_name="Already Done")
    first = make_scenario(module.module_id, 0)
    progress = make_progress(user.user_id, module.module_id, status=ProgressStatus.COMPLETED, current_scenario_index=1)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 1, "status": "completed", "score_delta": 10},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Module already completed"


def test_progress_rejects_invalid_scenario(
    client,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="invalid_scenario", email="invalid_scenario@test.com", role=Role.USER)
    module = make_module(module_name="Scenario Validation")
    first = make_scenario(module.module_id, 0)
    progress = make_progress(user.user_id, module.module_id)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 99, "status": "completed", "score_delta": 10},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid scenario"


def test_progress_rejects_out_of_order_scenario(
    client,
    make_user,
    make_module,
    make_scenario,
    make_progress,
    make_session,
    current_user_override,
):
    user = make_user(username="out_of_order", email="out_of_order@test.com", role=Role.USER)
    module = make_module(module_name="Order Validation")
    first = make_scenario(module.module_id, 0)
    make_scenario(module.module_id, 1)
    progress = make_progress(user.user_id, module.module_id, current_scenario_index=0)
    session = make_session(progress.progress_id, first.scenario_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/api/sessions/{session.session_token}/progress",
        json={"scenario_index": 1, "status": "completed", "score_delta": 10},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid scenario order"
