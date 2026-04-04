from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from cognitive_backend.db.database import get_db
from cognitive_backend.models.models import User, CognitiveSession
from cognitive_backend.schemas.schemas import SessionCreate, SessionOut, AdaptiveDifficultyOut
from cognitive_backend.services.auth_service import get_current_user, require_role
from cognitive_backend.services.scoring_service import compute_score, recommend_next_difficulty, EXERCISE_DOMAIN
from cognitive_backend.services.ai_feedback_service import generate_ai_feedback

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.post("", response_model=SessionOut, status_code=201)
def submit_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a completed exercise session from the frontend.
    Backend auto-computes score and generates AI feedback.
    """
    # Compute score from raw trial data
    scores = compute_score(payload.trial_data)

    # Fetch last 5 sessions of same exercise for trend & feedback context
    recent = (
        db.query(CognitiveSession)
        .filter(
            CognitiveSession.patient_id == current_user.id,
            CognitiveSession.exercise_type == payload.exercise_type,
        )
        .order_by(CognitiveSession.completed_at.desc())
        .limit(5)
        .all()
    )
    recent_scores = [s.score_pct for s in reversed(recent)]

    # Generate AI feedback
    ai_text = generate_ai_feedback(
        exercise_type=payload.exercise_type,
        score_pct=scores["score_pct"],
        difficulty_level=payload.difficulty_level,
        correct=scores["correct_answers"],
        total=scores["total_questions"],
        avg_response_ms=scores["avg_response_ms"],
        recent_scores=recent_scores,
    )

    session = CognitiveSession(
        patient_id=current_user.id,
        exercise_type=payload.exercise_type,
        difficulty_level=payload.difficulty_level,
        trial_data=[t.model_dump() for t in payload.trial_data],
        session_notes=payload.session_notes,
        ai_feedback=ai_text,
        **scores,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=List[SessionOut])
def get_my_sessions(
    exercise_type: str = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current patient's session history with optional filter by exercise type."""
    q = db.query(CognitiveSession).filter(CognitiveSession.patient_id == current_user.id)
    if exercise_type:
        q = q.filter(CognitiveSession.exercise_type == exercise_type)
    return q.order_by(CognitiveSession.completed_at.desc()).offset(offset).limit(limit).all()


@router.get("/adaptive-difficulty/{exercise_type}", response_model=AdaptiveDifficultyOut)
def get_adaptive_difficulty(
    exercise_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Call this BEFORE starting an exercise to get the recommended difficulty level.
    Based on the patient's last 3 sessions of that exercise type.
    """
    recent = (
        db.query(CognitiveSession)
        .filter(
            CognitiveSession.patient_id == current_user.id,
            CognitiveSession.exercise_type == exercise_type,
        )
        .order_by(CognitiveSession.completed_at.desc())
        .limit(3)
        .all()
    )
    recent_scores = [s.score_pct for s in reversed(recent)]
    current_level = recent[0].difficulty_level if recent else 1

    result = recommend_next_difficulty(exercise_type, current_level, recent_scores)
    return AdaptiveDifficultyOut(**result)


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single session by ID. Patients can only see their own sessions."""
    session = db.query(CognitiveSession).filter(CognitiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if current_user.role == "patient" and session.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return session
