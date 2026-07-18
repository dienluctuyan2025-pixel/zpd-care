from sqlalchemy import create_engine, Column, Integer, String, Date, Float, Text, ForeignKey, event, DateTime
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="expert")  # expert | parent | admin
    student_id = Column(Integer, ForeignKey('students.id'), nullable=True, index=True)
    is_active = Column(Integer, default=1)

    student = relationship("Student", back_populates="parent_users")

class Student(Base):
    __tablename__ = 'students'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String, nullable=False)
    class_name = Column(String, nullable=False)
    # Cached triangulation result for school dashboard performance
    cached_risk_score = Column(Float, nullable=True)
    cached_risk_status = Column(String, nullable=True)
    cached_risk_color = Column(String, nullable=True)
    risk_updated_at = Column(DateTime, nullable=True)
    
    behavior_logs = relationship("TeacherBehaviorLog", back_populates="student", cascade="all, delete")
    parent_surveys = relationship("ParentSurvey", back_populates="student", cascade="all, delete")
    probes = relationship("ProactiveProbe", back_populates="student", cascade="all, delete")
    parent_users = relationship("User", back_populates="student")

class TeacherBehaviorLog(Base):
    __tablename__ = 'teacher_behavior_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), index=True)
    date = Column(Date, default=datetime.date.today)
    raw_text = Column(Text, nullable=False)
    parsed_json = Column(Text, nullable=True)  # Store AI parsed JSON as text string
    
    student = relationship("Student", back_populates="behavior_logs")

class ParentSurvey(Base):
    __tablename__ = 'parent_surveys'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), index=True)
    date = Column(Date, default=datetime.date.today)
    social_score = Column(Float, default=0.0)
    routine_score = Column(Float, default=0.0)
    attention_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    
    student = relationship("Student", back_populates="parent_surveys")

class ProactiveProbe(Base):
    __tablename__ = 'proactive_probes'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), index=True)
    date = Column(Date, default=datetime.date.today)
    generated_scenario = Column(Text, nullable=False)
    test_category = Column(String, nullable=False) # axis label / legacy
    result_status = Column(String, nullable=False, default="Chờ kiểm tra") # Chờ kiểm tra | Hoàn thành | Bỏ qua
    # Scientific catalog fields
    module_id = Column(String, nullable=True, index=True)
    rubric_score = Column(Integer, nullable=True)  # 1-4 teacher score
    cars_mapped = Column(Float, nullable=True)     # same 1-4 for triangulation
    scored = Column(Integer, default=0)            # 1 = counts toward risk
    telemetry_json = Column(Text, nullable=True)   # game metrics JSON
    teacher_notes = Column(Text, nullable=True)
    scored_by = Column(String, nullable=True)
    scored_at = Column(DateTime, nullable=True)
    
    student = relationship("Student", back_populates="probes")

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./mat_than_su_pham.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def _ensure_column(table: str, column: str, col_type: str):
    """Lightweight SQLite migration for new columns."""
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        existing = {r[1] for r in rows}
        if column not in existing:
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            conn.commit()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Migrate existing DBs (create_all does not add new columns)
    try:
        _ensure_column("students", "cached_risk_score", "FLOAT")
        _ensure_column("students", "cached_risk_status", "VARCHAR")
        _ensure_column("students", "cached_risk_color", "VARCHAR")
        _ensure_column("students", "risk_updated_at", "DATETIME")
        _ensure_column("proactive_probes", "module_id", "VARCHAR")
        _ensure_column("proactive_probes", "rubric_score", "INTEGER")
        _ensure_column("proactive_probes", "cars_mapped", "FLOAT")
        _ensure_column("proactive_probes", "scored", "INTEGER")
        _ensure_column("proactive_probes", "telemetry_json", "TEXT")
        _ensure_column("proactive_probes", "teacher_notes", "TEXT")
        _ensure_column("proactive_probes", "scored_by", "VARCHAR")
        _ensure_column("proactive_probes", "scored_at", "DATETIME")
    except Exception as e:
        print(f"Schema migrate note: {e}")

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
