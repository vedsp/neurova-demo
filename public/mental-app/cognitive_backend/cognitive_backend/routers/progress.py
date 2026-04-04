from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from cognitive_backend.db.database import get_db
from cognitive_backend.models.models import User, CognitiveSession
from cognitive_backend.schemas.schemas import ProgressSummary, DomainScore, WeeklyTrend, SessionOut
from cognitive_backend.services.auth_service import get_current_user
from cognitive_backend.services.scoring_service import EXERCISE_DOMAIN, compute_composite_index
from cognitive_backend.services.gemini_analysis_service import analyze_game_performance, analyze_all_games

router = APIRouter(prefix="/api/progress", tags=["Progress & Analytics"])


def _get_patient_summary(patient_id: int, db: Session) -> ProgressSummary:
    sessions = (
        db.query(CognitiveSession)
        .filter(CognitiveSession.patient_id == patient_id)
        .order_by(CognitiveSession.completed_at.asc())
        .all()
    )

    if not sessions:
        return ProgressSummary(
            patient_id=patient_id, total_sessions=0, avg_accuracy=0,
            best_accuracy=0, improvement_pct=0, current_streak=0,
            domain_scores=[], recent_sessions=[],
        )

    scores = [s.score_pct for s in sessions]
    avg_acc = round(sum(scores) / len(scores), 1)
    best    = max(scores)
    improvement = round(scores[-1] - scores[0], 1) if len(scores) > 1 else 0.0

    # Streak: consecutive sessions with score >= 70
    streak = 0
    for s in reversed(sessions):
        if s.score_pct >= 70:
            streak += 1
        else:
            break

    # Domain averages
    domain_data: dict[str, list] = {}
    for s in sessions:
        domain = EXERCISE_DOMAIN.get(s.exercise_type, "other")
        domain_data.setdefault(domain, []).append(s.score_pct)

    domain_scores = [
        DomainScore(
            domain=domain,
            score=round(sum(v) / len(v), 1),
            sessions_count=len(v)
        )
        for domain, v in domain_data.items()
    ]

    recent = sessions[-10:]

    return ProgressSummary(
        patient_id=patient_id,
        total_sessions=len(sessions),
        avg_accuracy=avg_acc,
        best_accuracy=best,
        improvement_pct=improvement,
        current_streak=streak,
        domain_scores=domain_scores,
        recent_sessions=recent,
    )


@router.get("/summary", response_model=ProgressSummary)
def my_progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full progress summary for the logged-in patient."""
    return _get_patient_summary(current_user.id, db)


@router.get("/weekly-trend", response_model=List[WeeklyTrend])
def weekly_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns average score per ISO week — used for the line chart on the frontend.
    """
    sessions = (
        db.query(CognitiveSession)
        .filter(CognitiveSession.patient_id == current_user.id)
        .order_by(CognitiveSession.completed_at.asc())
        .all()
    )

    weekly: dict[str, list] = {}
    for s in sessions:
        dt = s.completed_at
        key = f"{dt.year}-W{dt.strftime('%V')}"
        weekly.setdefault(key, []).append(s.score_pct)

    return [
        WeeklyTrend(
            week=week,
            avg_score=round(sum(v) / len(v), 1),
            sessions=len(v),
        )
        for week, v in sorted(weekly.items())
    ]


@router.get("/composite-index")
def composite_index(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the weighted composite memory index (0-100) and per-domain breakdown.
    """
    sessions = (
        db.query(CognitiveSession)
        .filter(CognitiveSession.patient_id == current_user.id)
        .all()
    )
    domain_data: dict[str, list] = {}
    for s in sessions:
        domain = EXERCISE_DOMAIN.get(s.exercise_type, "other")
        domain_data.setdefault(domain, []).append(s.score_pct)

    domain_avgs = {d: round(sum(v)/len(v), 1) for d, v in domain_data.items()}
    composite = compute_composite_index(domain_avgs)

    return {
        "composite_index": composite,
        "domain_breakdown": domain_avgs,
        "total_sessions": len(sessions),
    }


@router.get("/games-analysis")
def games_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns detailed analytics per game/exercise type:
    - Total sessions, avg score, best score, improvement trend
    - Recent session scores for charting
    """
    sessions = (
        db.query(CognitiveSession)
        .filter(CognitiveSession.patient_id == current_user.id)
        .order_by(CognitiveSession.completed_at.asc())
        .all()
    )

    # Group by exercise type
    exercise_data: dict[str, list] = {}
    for s in sessions:
        exercise_data.setdefault(s.exercise_type, []).append(s)

    games_analytics = []
    game_names = {
        "digit_span": "Digit Span",
        "pattern_recall": "Pattern Recall",
        "word_recall": "Word Recall",
        "sequence_memory": "Sequence Memory",
    }
    game_icons = {
        "digit_span": "①",
        "pattern_recall": "▦",
        "word_recall": "≣",
        "sequence_memory": "▶",
    }

    for exercise_type, exersessions in exercise_data.items():
        scores = [s.score_pct for s in exersessions]
        avg_score = round(sum(scores) / len(scores), 1)
        best_score = max(scores)
        worst_score = min(scores)
        improvement = round(scores[-1] - scores[0], 1) if len(scores) > 1 else 0.0
        
        # Get last 10 sessions for chart
        recent_scores = [s.score_pct for s in exersessions[-10:]]
        recent_dates = [s.completed_at.isoformat() for s in exersessions[-10:]]
        
        games_analytics.append({
            "exercise_type": exercise_type,
            "display_name": game_names.get(exercise_type, exercise_type.replace("_", " ").title()),
            "icon": game_icons.get(exercise_type, "▶"),
            "total_sessions": len(exersessions),
            "avg_score": avg_score,
            "best_score": best_score,
            "worst_score": worst_score,
            "improvement_pct": improvement,
            "recent_scores": recent_scores,
            "recent_dates": recent_dates,
        })

    return {"games": games_analytics}


@router.get("/ai-game-analysis/{exercise_type}")
def ai_analyze_game(
    exercise_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered analysis for a specific game using Gemini.
    Returns insights, recommendations, encouragement, and next steps.
    """
    sessions = (
        db.query(CognitiveSession)
        .filter(
            CognitiveSession.patient_id == current_user.id,
            CognitiveSession.exercise_type == exercise_type,
        )
        .order_by(CognitiveSession.completed_at.asc())
        .all()
    )

    if not sessions:
        return {
            "exercise_type": exercise_type,
            "error": "No sessions found for this game",
            "message": "Complete at least one session to get AI analysis"
        }

    # Build game data for analysis
    scores = [s.score_pct for s in sessions]
    avg_score = round(sum(scores) / len(scores), 1)
    best_score = max(scores)
    worst_score = min(scores)
    improvement = round(scores[-1] - scores[0], 1) if len(scores) > 1 else 0.0
    recent_scores = [s.score_pct for s in sessions[-10:]]

    game_names = {
        "digit_span": "Digit Span",
        "pattern_recall": "Pattern Recall",
        "word_recall": "Word Recall",
        "sequence_memory": "Sequence Memory",
    }
    domain_map = {
        "digit_span": "working_memory",
        "pattern_recall": "visual_spatial",
        "word_recall": "episodic",
        "sequence_memory": "procedural",
    }

    game_data = {
        "exercise_type": exercise_type,
        "display_name": game_names.get(exercise_type, exercise_type),
        "total_sessions": len(sessions),
        "avg_score": avg_score,
        "best_score": best_score,
        "worst_score": worst_score,
        "improvement_pct": improvement,
        "recent_scores": recent_scores,
        "domain": domain_map.get(exercise_type, "other")
    }

    # Get AI analysis
    analysis = analyze_game_performance(game_data)
    return analysis


@router.get("/ai-portfolio-analysis")
def ai_analyze_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered analysis of the patient's overall cognitive game portfolio.
    Identifies strengths, weaknesses, and personalized recommendations.
    """
    sessions = (
        db.query(CognitiveSession)
        .filter(CognitiveSession.patient_id == current_user.id)
        .order_by(CognitiveSession.completed_at.asc())
        .all()
    )

    if not sessions:
        return {
            "error": "No sessions found",
            "message": "Complete games to get portfolio analysis"
        }

    # Group by exercise type
    exercise_data: dict[str, list] = {}
    for s in sessions:
        exercise_data.setdefault(s.exercise_type, []).append(s)

    game_names = {
        "digit_span": "Digit Span",
        "pattern_recall": "Pattern Recall",
        "word_recall": "Word Recall",
        "sequence_memory": "Sequence Memory",
    }
    domain_map = {
        "digit_span": "working_memory",
        "pattern_recall": "visual_spatial",
        "word_recall": "episodic",
        "sequence_memory": "procedural",
    }

    # Build games list for portfolio analysis
    games_list = []
    for exercise_type, exersessions in exercise_data.items():
        scores = [s.score_pct for s in exersessions]
        avg_score = round(sum(scores) / len(scores), 1)
        best_score = max(scores)
        worst_score = min(scores)
        improvement = round(scores[-1] - scores[0], 1) if len(scores) > 1 else 0.0
        
        games_list.append({
            "exercise_type": exercise_type,
            "display_name": game_names.get(exercise_type, exercise_type),
            "total_sessions": len(exersessions),
            "avg_score": avg_score,
            "best_score": best_score,
            "worst_score": worst_score,
            "improvement_pct": improvement,
            "domain": domain_map.get(exercise_type, "other")
        })

    # Get AI portfolio analysis
    analysis = analyze_all_games(games_list)
    return analysis
