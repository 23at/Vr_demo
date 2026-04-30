from backend.auth.auth_handler import get_current_active_user
from backend.schemas import AccessLevel, ProgressStatus, Role, SessionStatus


class FakeS3:
    def put_object(self, Bucket, Key, Body):
        return {"ETag": "etag"}

    def create_multipart_upload(self, Bucket, Key):
        return {"UploadId": "upload-id"}

    def upload_part(self, Bucket, Key, UploadId, PartNumber, Body):
        return {"ETag": f"etag-{PartNumber}"}

    def complete_multipart_upload(self, Bucket, Key, UploadId, MultipartUpload):
        return {"ok": True}

    def abort_multipart_upload(self, Bucket, Key, UploadId):
        return {"aborted": True}

    def generate_presigned_url(self, *args, **kwargs):
        return "http://signed-url"


def test_upload_module_file_success(client, make_user, make_module, current_user_override, monkeypatch):
    import backend.routers.mods as mods_router

    monkeypatch.setattr(mods_router, "s3", FakeS3())
    admin = make_user(username="admin", email="admin@test.com", role=Role.ADMIN)
    module = make_module(module_name="Upload Test")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        f"/modules/{module.module_id}/upload",
        files={"file": ("module.zip", b"hello world", "application/zip")},
    )

    assert response.status_code == 200
    assert response.json()["module_id"] == module.module_id


def test_upload_module_file_rejects_non_admin(client, make_user, make_module, current_user_override, monkeypatch):
    import backend.routers.mods as mods_router

    monkeypatch.setattr(mods_router, "s3", FakeS3())
    user = make_user(username="user", email="user@test.com", role=Role.USER)
    module = make_module(module_name="Upload Reject")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        f"/modules/{module.module_id}/upload",
        files={"file": ("module.zip", b"hello world", "application/zip")},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"


def test_get_signed_url_returns_metadata(client, make_user, make_module, current_user_override, monkeypatch):
    import backend.routers.mods as mods_router

    monkeypatch.setattr(mods_router, "s3", FakeS3())
    user = make_user(username="user2", email="user2@test.com", role=Role.USER)
    module = make_module(module_name="Signed URL")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.get(f"/modules/{module.module_id}/signed-url")

    assert response.status_code == 200
    assert response.json()["signed_url"] == "http://signed-url"


def test_create_module_success(client, make_user, current_user_override):
    admin = make_user(username="admin2", email="admin2@test.com", role=Role.ADMIN)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        "/modules",
        json={"module_name": "New Module", "version": "1.2.3", "description": "desc"},
    )

    assert response.status_code == 200
    assert response.json()["module_name"] == "New Module"


def test_create_module_rejects_duplicate_name(client, make_user, make_module, current_user_override):
    admin = make_user(username="admin3", email="admin3@test.com", role=Role.ADMIN)
    make_module(module_name="Duplicate")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        "/modules",
        json={"module_name": "Duplicate", "version": "1.0.0", "description": "desc"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Module with this name already exists"


def test_get_modules_for_admin(client, make_user, make_module, current_user_override):
    admin = make_user(username="admin4", email="admin4@test.com", role=Role.ADMIN)
    module = make_module(module_name="Admin Visible")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.get("/modules")

    assert response.status_code == 200
    assert any(item["module_id"] == module.module_id for item in response.json())


def test_get_modules_for_user_returns_progress(client, make_user, make_module, make_assignment, make_progress, make_scenario, current_user_override):
    user = make_user(username="student", email="student@test.com")
    module = make_module(module_name="User Progress")
    make_assignment(user.user_id, module.module_id, access_level=AccessLevel.FULL)
    make_scenario(module.module_id, 0)
    make_scenario(module.module_id, 1)
    make_progress(user.user_id, module.module_id, current_scenario_index=1, total_score=5)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.get("/modules")

    assert response.status_code == 200
    assert response.json()[0]["status"] == "Incomplete"
    assert response.json()[0]["progress_pct"] == 50


def test_get_module_requires_admin(client, make_user, make_module, current_user_override):
    user = make_user(username="plain", email="plain@test.com")
    module = make_module(module_name="Private Module")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.get(f"/modules/{module.module_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"


def test_get_module_returns_module_for_admin(client, make_user, make_module, current_user_override, monkeypatch):
    import backend.routers.mods as mods_router

    monkeypatch.setattr(mods_router, "s3", FakeS3())
    admin = make_user(username="admin5", email="admin5@test.com", role=Role.ADMIN)
    module = make_module(module_name="Module Detail")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.get(f"/modules/{module.module_id}")

    assert response.status_code == 200
    assert response.json()["module_name"] == "Module Detail"


def test_launch_module_success(client, db, make_user, make_module, make_assignment, make_scenario, current_user_override):
    user = make_user(username="launch_user", email="launch@test.com")
    module = make_module(module_name="Launch Ready")
    scenario = make_scenario(module.module_id, 0)
    make_assignment(user.user_id, module.module_id, access_level=AccessLevel.FULL)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post("/launch-module", json={"module_id": module.module_id})

    assert response.status_code == 200
    assert response.json()["scenario_id"] == scenario.scenario_id
    assert response.json()["scenario_index"] == scenario.scenario_index
    assert response.json()["current_scenario_index"] == 0
    assert "session_token" in response.json()


def test_launch_module_rejects_unassigned_user(client, make_user, make_module, make_scenario, current_user_override):
    user = make_user(username="blocked_launch", email="blocked_launch@test.com")
    module = make_module(module_name="Locked Module")
    make_scenario(module.module_id, 0)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post("/launch-module", json={"module_id": module.module_id})

    assert response.status_code == 403
    assert response.json()["detail"] == "Access to this module is not permitted"


def test_launch_module_rejects_completed_progress(client, make_user, make_module, make_assignment, make_progress, make_scenario, current_user_override):
    user = make_user(username="done_user", email="done@test.com")
    module = make_module(module_name="Completed Module")
    make_scenario(module.module_id, 0)
    make_assignment(user.user_id, module.module_id, access_level=AccessLevel.FULL)
    make_progress(user.user_id, module.module_id, status=ProgressStatus.COMPLETED)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post("/launch-module", json={"module_id": module.module_id})

    assert response.status_code == 400
    assert response.json()["detail"] == "Module already completed"


def test_launch_module_resumes_existing_progress(client, make_user, make_module, make_assignment, make_progress, make_scenario, current_user_override):
    user = make_user(username="resume_user", email="resume@test.com")
    module = make_module(module_name="Resume Module")
    make_scenario(module.module_id, 0, name="Scenario Zero")
    resumed = make_scenario(module.module_id, 1, name="Scenario One")
    make_assignment(user.user_id, module.module_id, access_level=AccessLevel.FULL)
    make_progress(
        user.user_id,
        module.module_id,
        status=ProgressStatus.INPROGRESS,
        current_scenario_index=1,
        total_score=15,
    )
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post("/launch-module", json={"module_id": module.module_id})

    assert response.status_code == 200
    assert response.json()["scenario_id"] == resumed.scenario_id
    assert response.json()["scenario_index"] == 1
    assert response.json()["current_scenario_index"] == 1


def test_create_scenario_success(client, make_user, make_module, current_user_override):
    admin = make_user(username="admin6", email="admin6@test.com", role=Role.ADMIN)
    module = make_module(module_name="Scenario Module")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        f"/modules/{module.module_id}/scenarios",
        json={"name": "Scenario A", "module_id": module.module_id, "scenario_index": 0},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Scenario A"


def test_get_scenarios_by_module_success(client, make_user, make_module, make_scenario, current_user_override):
    admin = make_user(username="admin7", email="admin7@test.com", role=Role.ADMIN)
    module = make_module(module_name="Scenario List")
    make_scenario(module.module_id, 0, name="Scenario Zero")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.get(f"/modules/{module.module_id}/scenarios")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Scenario Zero"


def test_update_scenario_success(client, make_user, make_module, make_scenario, current_user_override):
    admin = make_user(username="admin8", email="admin8@test.com", role=Role.ADMIN)
    module = make_module(module_name="Scenario Update")
    scenario = make_scenario(module.module_id, 0, name="Old Name")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.put(
        f"/scenarios/{scenario.scenario_id}",
        json={"name": "New Name", "scenario_index": 1},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["scenario_index"] == 1


def test_delete_scenario_success(client, make_user, make_module, make_scenario, current_user_override):
    admin = make_user(username="admin9", email="admin9@test.com", role=Role.ADMIN)
    module = make_module(module_name="Scenario Delete")
    scenario = make_scenario(module.module_id, 0)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.delete(f"/scenarios/{scenario.scenario_id}")

    assert response.status_code == 200
    assert response.json()["message"] == "Scenario deleted successfully"
