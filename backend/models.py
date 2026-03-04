# models.py
from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, UniqueConstraint, DateTime,Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from .schemas import Role, ProgressStatus, SessionStatus
Base = declarative_base()



class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(150), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=True)

    # Relationships
    progress_records = relationship("Progress", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(user_id={self.user_id}, username='{self.username}', email='{self.email}')>"
    


class TrainingModule(Base):
    __tablename__ = "training_module"

    module_id = Column(Integer, primary_key=True, autoincrement=True)
    module_name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    scenarios = relationship("Scenario", back_populates="module", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="module", cascade="all, delete-orphan")

    


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

    __table_args__ = (
        UniqueConstraint("progress_id", "scenario_id", "session_index", name="uq_session_progress_scenario_index"),
    )

    # Relationships
    progress = relationship("Progress", back_populates="training_sessions")
    scenario = relationship("Scenario", back_populates="training_sessions")

   
class Scenario(Base):
    __tablename__ = "scenario"

    scenario_id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("training_module.module_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)

    __table_args__ = (
        UniqueConstraint("module_id", "name", name="uq_scenario_module_name"),
    )

    # Relationships
    module = relationship("TrainingModule", back_populates="scenarios")
    training_sessions = relationship("TrainingSession", back_populates="scenario", cascade="all, delete-orphan")

   

class Progress(Base):
    __tablename__ = "progress"

    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Integer, ForeignKey("training_module.module_id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ProgressStatus), nullable=True)
    current_scenario_index = Column(Integer, nullable=True, default=0)
    total_score = Column(Integer, nullable=True, default=0.0)
    last_saved = Column(DateTime, nullable=True, default=datetime)

    __table_args__ = (
        UniqueConstraint("user_id", "module_id", name="uq_progress_user_module"),
    )

    # Relationships
    user = relationship("User", back_populates="progress_records")
    module = relationship("TrainingModule", back_populates="progress_records")
    training_sessions = relationship("TrainingSession", back_populates="progress", cascade="all, delete-orphan")

  