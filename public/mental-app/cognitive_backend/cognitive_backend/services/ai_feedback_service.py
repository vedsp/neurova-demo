import anthropic
from cognitive_backend.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

EXERCISE_LABELS = {
    "digit_span":       "Digit Span (Working Memory)",
    "pattern_recall":   "Pattern Recall (Visual-Spatial Memory)",
    "word_recall":      "Word Recall (Episodic Memory)",
    "sequence_memory":  "Sequence Memory (Procedural Memory)",
}

def generate_ai_feedback(
    exercise_type: str,
    score_pct: float,
    difficulty_level: int,
    correct: int,
    total: int,
    avg_response_ms: float | None,
    recent_scores: list[float],   # last few sessions for trend
) -> str:
    """
    Call Claude API to generate personalized rehabilitation feedback.
    Falls back to rule-based feedback if API key is not configured.
    """
    if not client:
        return _fallback_feedback(score_pct)

    trend = "improving" if len(recent_scores) >= 2 and recent_scores[-1] > recent_scores[0] else \
            "declining" if len(recent_scores) >= 2 and recent_scores[-1] < recent_scores[0] else "stable"

    prompt = f"""You are a compassionate cognitive rehabilitation specialist AI assistant.

A patient just completed a memory exercise. Give them SHORT, encouraging, clinically-aware feedback (3-4 sentences max).

Exercise: {EXERCISE_LABELS.get(exercise_type, exercise_type)}
Score: {score_pct:.0f}% ({correct}/{total} correct)
Difficulty Level: {difficulty_level}/20
Average Response Time: {f"{avg_response_ms/1000:.1f}s" if avg_response_ms else "N/A"}
Recent Score Trend: {trend} (last {len(recent_scores)} sessions: {[f"{s:.0f}%" for s in recent_scores]})

Rules:
- Be warm and clinical, not generic
- Mention the specific memory domain being exercised
- Give one concrete tip relevant to this exercise type
- If declining, be gentle and suggest a specific strategy
- Do NOT use bullet points — write as natural flowing sentences
- Keep it under 80 words
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text.strip()
    except Exception as e:
        return _fallback_feedback(score_pct)


def _fallback_feedback(score_pct: float) -> str:
    """Rule-based fallback when Anthropic API is unavailable."""
    if score_pct >= 80:
        return "Excellent performance! Your memory recall is strong. Consider increasing the difficulty to keep challenging your brain."
    elif score_pct >= 50:
        return "Good effort! Consistency is key in cognitive rehabilitation. Regular daily practice of 15-20 minutes shows the best results."
    else:
        return "Keep going — memory improves with repetition. Try focusing on chunking information into smaller groups to improve recall."
