# create_tables.py (run once)
from app.database import engine, Base
from app.models import Base as ModelsBase

Base.metadata.create_all(bind=engine)  # Creates ALL tables
print("✅ All tables created!")
