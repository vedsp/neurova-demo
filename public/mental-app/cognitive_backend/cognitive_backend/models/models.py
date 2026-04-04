from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from cognitive_backend.db.database import Base


class User(Base):
    """
    Shared User model — works for both Patient and Therapist roles.
    Other teams can extend this with profile fields.
    role: 'patient' | 'therapist' | 'admin'
    """
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role          = Column(String, default="patient")   # patient | therapist | admin
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sessions      = relationship("CognitiveSession", back_populates="patient", foreign_keys="CognitiveSession.patient_id")
    assigned_patients = relationship("TherapistPatient", back_populates="therapist", foreign_keys="TherapistPatient.therapist_id")
    assigned_therapist = relationship("TherapistPatient", back_populates="patient", foreign_keys="TherapistPatient.patient_id")


class TherapistPatient(Base):
    """Maps therapists to their patients."""
    __tablename__ = "therapist_patients"

    id           = Column(Integer, primary_key=True, index=True)
    therapist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at  = Column(DateTime(timezone=True), server_default=func.now())

    therapist    = relationship("User", foreign_keys=[therapist_id], back_populates="assigned_patients")
    patient      = relationship("User", foreign_keys=[patient_id], back_populates="assigned_therapist")


class CognitiveSession(Base):
    """
    One completed exercise session by a patient.
    exercise_type: digit_span | pattern_recall | word_recall | sequence_memory
    """
    __tablename__ = "cognitive_sessions"

    id              = Column(Integer, primary_key=True, index=True)
    patient_id      = Column(Integer, ForeignKey("users.id"), nullable=False)

    exercise_type   = Column(String, nullable=False)   # digit_span | pattern_recall | word_recall | sequence_memory
    difficulty_level= Column(Integer, default=1)
    score_pct       = Column(Float, nullable=False)     # 0-100
    correct_answers = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    avg_response_ms = Column(Float, nullable=True)      # average response time in ms

    # Raw trial data stored as JSON for deep analytics
    trial_data      = Column(JSON, default=list)        # list of {question, answer, correct, response_ms}

    ai_feedback     = Column(Text, nullable=True)       # AI-generated feedback text
    session_notes   = Column(Text, nullable=True)       # optional therapist notes

    completed_at    = Column(DateTime(timezone=True), server_default=func.now())

    patient         = relationship("User", back_populates="sessions", foreign_keys=[patient_id])


class MemoryScore(Base):
    """
    Computed weekly composite memory score per patient per domain.
    Recalculated after each session by the scoring service.
    domain: working_memory | visual_spatial | episodic | procedural | composite
    """
    __tablename__ = "memory_scores"

    id          = Column(Integer, primary_key=True, index=True)
    patient_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain      = Column(String, nullable=False)
    score       = Column(Float, nullable=False)   # 0-100
    week_number = Column(Integer, nullable=False) # ISO week
    year        = Column(Integer, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
