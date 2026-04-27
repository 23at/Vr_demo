from backend.auth.auth_handler import get_current_active_user
from backend.schemas import ProgressStatus, Role


def test_get_admin_users_returns_progress(client, make_user, make_module, make_assignment, make_progress, current_user_override):
    admin = make_user(username="admin", email="admin@test.com", role=Role.ADMIN)
    trainee = make_user(username="trainee", email="trainee@test.com", role=Role.USER)
    module = make_module(module_name="Safety")
    make_assignment(trainee.user_id, module.module_id, assigned_by=admin.user_id)
    make_progress(
        trainee.user_id,
        module.module_id,
        status=ProgressStatus.INPROGRESS,
        current_scenario_index=1,
        total_score=12,
    )

    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)
    response = client.get("/admin/users")

    assert response.status_code == 200
    assert response.json()[0]["username"] == "trainee"
    assert response.json()[0]["modules"][0]["status"] == "In Progress"


def test_assign_module_creates_assignment(client, make_user, make_module, current_user_override):
    admin = make_user(username="admin2", email="admin2@test.com", role=Role.ADMIN)
    trainee = make_user(username="trainee2", email="trainee2@test.com")
    module = make_module(module_name="Operations")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        f"/admin/assign?user_id={trainee.user_id}&module_id={module.module_id}"
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Module assigned"


def test_assign_module_is_idempotent(client, make_user, make_module, make_assignment, current_user_override):
    admin = make_user(username="admin3", email="admin3@test.com", role=Role.ADMIN)
    trainee = make_user(username="trainee3", email="trainee3@test.com")
    module = make_module(module_name="Operations 2")
    make_assignment(trainee.user_id, module.module_id, assigned_by=admin.user_id)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        f"/admin/assign?user_id={trainee.user_id}&module_id={module.module_id}"
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Already assigned"


def test_update_admin_user_record(client, make_user, current_user_override):
    admin = make_user(username="admin4", email="admin4@test.com", role=Role.ADMIN)
    trainee = make_user(username="old_name", email="old@test.com")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.put(
        f"/admin/users/{trainee.user_id}",
        json={
            "username": "updated_name",
            "email": "updated@test.com",
            "password": "NewSecret123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "User updated"


def test_delete_admin_user_record(client, make_user, current_user_override):
    admin = make_user(username="admin5", email="admin5@test.com", role=Role.ADMIN)
    trainee = make_user(username="remove_me", email="remove@test.com")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.delete(f"/admin/users/{trainee.user_id}")

    assert response.status_code == 200
    assert response.json()["message"] == "User deleted"


def test_admin_routes_reject_non_admin(client, make_user, make_module, current_user_override):
    user = make_user(username="plain_user", email="plain@test.com", role=Role.USER)
    module = make_module(module_name="Reject Me")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(f"/admin/assign?user_id={user.user_id}&module_id={module.module_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin only"
