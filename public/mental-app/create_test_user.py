import sys
sys.path.append('.')

from db.database import SessionLocal
from models.models import User
from services.auth_service import hash_password

db = SessionLocal()
try:
    # Check if test user exists
    existing = db.query(User).filter(User.email == "dr@g.com").first()
    if existing:
        print("Test user already exists.")
        print(f"Email: dr@g.com")
        print(f"Password: test1234")
    else:
        # Create test user
        hashed = hash_password("test1234")
        user = User(
            email="dr@g.com",
            full_name="Dr. G",
            hashed_password=hashed,
            role="therapist"
        )
        db.add(user)
        db.commit()
        print("Test user created!")
        print(f"Email: dr@g.com")
        print(f"Password: test1234")
finally:
    db.close()