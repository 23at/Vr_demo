# models.py
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, UniqueConstraint, DateTime,Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .schemas import Role, ProgressStatus, SessionStatus,AccessLevel
Base = declarative_base()



class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(150), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=False, default=Role.USER)

    # Relationships
    assigned_modules = relationship("UserModule",back_populates="user",cascade="all, delete-orphan", foreign_keys="UserModule.user_id")
    progress_records = relationship("Progress", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(user_id={self.user_id}, username='{self.username}', email='{self.email}')>"
    


class TrainingModule(Base):
    __tablename__ = "training_module"

    module_id = Column(String, primary_key=True)
    module_name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    version = Column(String, nullable=False, default="1.0.0")
    r2_key = Column(String, nullable=True)
    cdn_checksum=Column(String, nullable=True)

    # Relationships
    scenarios = relationship("Scenario", back_populates="module", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="module", cascade="all, delete-orphan")
    assigned_users = relationship( "UserModule",back_populates="module",cascade="all, delete-orphan")
    


class TrainingSession(Base):
    __tablename__ = "training_session"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    progress_id = Column(Integer, ForeignKey("progress.progress_id", ondelete="CASCADE"), nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenario.scenario_id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    session_status = Column(Enum(SessionStatus), nullable=True)
    session_index = Column(Integer, nullable=False)
    score = Column(Integer, nullable=True)
    total_duration = Column(Integer, nullable=True) 
    session_token=Column(String, nullable=False) 

    __table_args__ = (
        UniqueConstraint("progress_id", "scenario_id", "session_index", name="uq_session_progress_scenario_index"),
    )

    # Relationships
    progress = relationship("Progress", back_populates="training_sessions")
    scenario = relationship("Scenario", back_populates="training_sessions")

   
class Scenario(Base):
    __tablename__ = "scenario"

    scenario_id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(String, ForeignKey("training_module.module_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    scenario_index = Column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("module_id", "scenario_index", name="uq__module_scenario_index"),
    )

    # Relationships
    module = relationship("TrainingModule", back_populates="scenarios")
    training_sessions = relationship("TrainingSession", back_populates="scenario", cascade="all, delete-orphan")

   

class Progress(Base):
    __tablename__ = "progress"

    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    module_id = Column(String, ForeignKey("training_module.module_id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ProgressStatus), default=ProgressStatus.INPROGRESS)
    current_scenario_index = Column(Integer, nullable=True, default=0)
    total_score = Column(Integer, default=0)
    last_saved = Column(DateTime(timezone=True), server_default=func.now(),onupdate=func.now())


    __table_args__ = (
        UniqueConstraint("user_id", "module_id", name="uq_progress_user_module"),
    )

    # Relationships
    user = relationship("User", back_populates="progress_records")
    module = relationship("TrainingModule", back_populates="progress_records")
    training_sessions = relationship("TrainingSession", back_populates="progress", cascade="all, delete-orphan")





class UserModule(Base):
    __tablename__ = "user_modules"

    # Composite primary key: user + module
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), primary_key=True)
    module_id = Column(String, ForeignKey("training_module.module_id", ondelete="CASCADE"), primary_key=True)
    
    # Who assigned this module
    assigned_by = Column(Integer, ForeignKey("user.user_id", ondelete="SET NULL"), nullable=True)
    
    # Timestamp of assignment
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Access level with Enum
    access_level = Column(Enum(AccessLevel), default=AccessLevel.FULL, nullable=False)

    # Relationships
    user = relationship("User", back_populates="assigned_modules", foreign_keys=[user_id])
    module = relationship("TrainingModule", back_populates="assigned_users", foreign_keys=[module_id])
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])

    # Optional helper methods
    def can_access(self):
        return self.access_level in [AccessLevel.FULL, AccessLevel.READ_ONLY]

    @property
    def is_full_access(self):
        return self.access_level == AccessLevel.FULL