from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# ── AUTH ─────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=6)
    role: str = Field(default="patient", pattern="^(patient|therapist|admin)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── SESSION ───────────────────────────────────────────────────────────
class TrialData(BaseModel):
    """Single question/answer trial inside a session."""
    question: Any                  # the stimulus shown (digits, words, pattern, etc.)
    answer: Any                    # what the patient answered
    correct: bool
    response_ms: Optional[float] = None

class SessionCreate(BaseModel):
    """
    POST body when frontend submits a completed exercise session.
    Frontend sends all trial data; backend computes score & AI feedback.
    """
    exercise_type: str = Field(pattern="^(digit_span|pattern_recall|word_recall|sequence_memory)$")
    difficulty_level: int = Field(ge=1, le=20)
    trial_data: List[TrialData]    # all individual trials
    session_notes: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    patient_id: int
    exercise_type: str
    difficulty_level: int
    score_pct: float
    correct_answers: int
    total_questions: int
    avg_response_ms: Optional[float]
    ai_feedback: Optional[str]
    session_notes: Optional[str]
    completed_at: datetime

    class Config:
        from_attributes = True


# ── PROGRESS & ANALYTICS ──────────────────────────────────────────────
class DomainScore(BaseModel):
    domain: str
    score: float
    sessions_count: int

class ProgressSummary(BaseModel):
    patient_id: int
    total_sessions: int
    avg_accuracy: float
    best_accuracy: float
    improvement_pct: float          # (latest - earliest) score
    current_streak: int
    domain_scores: List[DomainScore]
    recent_sessions: List[SessionOut]

class WeeklyTrend(BaseModel):
    week: str                       # e.g. "2024-W12"
    avg_score: float
    sessions: int

class AdaptiveDifficultyOut(BaseModel):
    """
    Returned after each session — tells frontend what difficulty to use next round.
    """
    exercise_type: str
    recommended_level: int
    reason: str                     # human-readable reason


# ── THERAPIST ─────────────────────────────────────────────────────────
class AssignPatient(BaseModel):
    patient_id: int

class PatientSummary(BaseModel):
    patient: UserOut
    total_sessions: int
    avg_accuracy: float
    last_session: Optional[datetime]
