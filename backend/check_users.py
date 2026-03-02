# backend/check_users.py
from app.database import SessionLocal
from app.models import User

db = SessionLocal()
users = db.query(User).all()
print("User emails:")
print([u.email for u in users])
print()
db.close()
