from typing import List, Optional
from cognitive_backend.schemas.schemas import TrialData

# ── DOMAIN MAPPING ────────────────────────────────────────────────────
EXERCISE_DOMAIN = {
    "digit_span":       "working_memory",
    "pattern_recall":   "visual_spatial",
    "word_recall":      "episodic",
    "sequence_memory":  "procedural",
}

# ── SCORE COMPUTATION ─────────────────────────────────────────────────
def compute_score(trials: List[TrialData]) -> dict:
    """
    Compute accuracy %, correct count, avg response time from raw trials.
    Returns dict ready to unpack into CognitiveSession fields.
    """
    if not trials:
        return {"score_pct": 0.0, "correct_answers": 0, "total_questions": 0, "avg_response_ms": None}

    correct = sum(1 for t in trials if t.correct)
    total   = len(trials)
    times   = [t.response_ms for t in trials if t.response_ms is not None]
    avg_ms  = round(sum(times) / len(times), 1) if times else None

    return {
        "score_pct":        round(correct / total * 100, 1),
        "correct_answers":  correct,
        "total_questions":  total,
        "avg_response_ms":  avg_ms,
    }


# ── ADAPTIVE DIFFICULTY ───────────────────────────────────────────────
def recommend_next_difficulty(
    exercise_type: str,
    current_level: int,
    recent_scores: List[float],   # last 3 sessions for this exercise
) -> dict:
    """
    Simple rule-based adaptive difficulty:
      avg >= 85%  → increase level by 1
      avg <= 50%  → decrease level by 1
      else        → maintain
    Returns recommended_level and a human-readable reason.
    """
    if not recent_scores:
        return {"recommended_level": current_level, "reason": "No history yet — starting at current level."}

    avg = sum(recent_scores) / len(recent_scores)

    if avg >= 85:
        new_level = min(current_level + 1, 20)
        reason = f"Average {avg:.0f}% over last {len(recent_scores)} sessions — increasing difficulty."
    elif avg <= 50:
        new_level = max(current_level - 1, 1)
        reason = f"Average {avg:.0f}% — reducing difficulty to build confidence."
    else:
        new_level = current_level
        reason = f"Average {avg:.0f}% — maintaining current level for consolidation."

    return {
        "exercise_type":       exercise_type,
        "recommended_level":   new_level,
        "reason":              reason,
    }


# ── COMPOSITE MEMORY INDEX ────────────────────────────────────────────
DOMAIN_WEIGHTS = {
    "working_memory":  0.30,
    "visual_spatial":  0.25,
    "episodic":        0.25,
    "procedural":      0.20,
}

def compute_composite_index(domain_avgs: dict) -> float:
    """
    Weighted composite memory index (0-100).
    domain_avgs: {domain_name: avg_score_float}
    """
    total = sum(
        domain_avgs.get(domain, 0) * weight
        for domain, weight in DOMAIN_WEIGHTS.items()
    )
    return round(total, 1)
