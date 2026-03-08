from backend.database import engine
from backend.models import User
from backend.auth.auth_handler import get_password_hash
from backend.schemas import Role
from sqlalchemy.orm import Session

# Create a test user
def create_test_user():
    db = Session(bind=engine)
    test_user = User(
        username="testuser",
        email="test@example.com",
        password_hash=get_password_hash("password123"),  # your plain password
        role=Role.ADMIN
    )
    db.add(test_user)
    db.commit()
    db.close()
    print("Test user created!")

create_test_user()