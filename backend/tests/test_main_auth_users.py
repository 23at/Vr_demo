from backend.auth.auth_handler import get_current_active_user
from backend.schemas import Role


def test_root_returns_health_message(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "FastAPI app is running!"}


def test_logout_returns_client_side_message(client):
    response = client.post("/logout")

    assert response.status_code == 200
    assert "client" in response.json()["message"]


def test_register_user_as_admin(client, make_user, current_user_override):
    admin = make_user(username="admin", email="admin@test.com", role=Role.ADMIN)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        "/auth/register",
        json={
            "username": "new_user",
            "email": "new_user@test.com",
            "password": "Secret123!",
            "first_name": "New",
            "last_name": "User",
            "role": "USER",
        },
    )

    assert response.status_code == 200
    assert response.json()["username"] == "new_user"
    assert response.json()["first_name"] == "New"


def test_register_user_rejects_non_admin(client, make_user, current_user_override):
    user = make_user(username="user", email="user@test.com", role=Role.USER)
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.post(
        "/auth/register",
        json={
            "username": "blocked",
            "email": "blocked@test.com",
            "password": "Secret123!",
            "role": "USER",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin only"


def test_register_user_rejects_duplicate_username(client, make_user, current_user_override):
    admin = make_user(username="admin2", email="admin2@test.com", role=Role.ADMIN)
    make_user(username="existing", email="existing@test.com")
    client.app.dependency_overrides[get_current_active_user] = current_user_override(admin)

    response = client.post(
        "/auth/register",
        json={
            "username": "existing",
            "email": "another@test.com",
            "password": "Secret123!",
            "role": "USER",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered."


def test_login_returns_access_token(client, make_user):
    make_user(username="login_user", email="login@test.com", password="Secret123!")

    response = client.post(
        "/auth/token",
        data={"username": "login_user", "password": "Secret123!"},
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert "access_token" in response.json()


def test_login_rejects_bad_credentials(client, make_user):
    make_user(username="login_user2", email="login2@test.com", password="Secret123!")

    response = client.post(
        "/auth/token",
        data={"username": "login_user2", "password": "wrong-pass"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"


def test_read_users_me_returns_authenticated_user(client, make_user, current_user_override):
    user = make_user(
        username="me",
        email="me@test.com",
        role=Role.USER,
        first_name="Test",
        last_name="User",
    )
    client.app.dependency_overrides[get_current_active_user] = current_user_override(user)

    response = client.get("/users/me/")

    assert response.status_code == 200
    assert response.json()["username"] == "me"
    assert response.json()["first_name"] == "Test"
