"""
AI-powered game analysis using Google Gemini API.
Provides personalized insights, trends, and recommendations based on cognitive game scores.
"""

import google.generativeai as genai
from cognitive_backend.config import settings


def initialize_gemini():
    """Initialize Gemini API with the API key from config."""
    if not settings.GEMINI_API_KEY:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel('gemini-2.5-pro')


def analyze_game_performance(game_data: dict) -> dict:
    """
    Analyze a player's performance on a cognitive game using Gemini.
    
    Args:
        game_data: {
            'exercise_type': str,
            'display_name': str,
            'total_sessions': int,
            'avg_score': float,
            'best_score': float,
            'worst_score': float,
            'improvement_pct': float,
            'recent_scores': list[float],
            'domain': str (working_memory, visual_spatial, episodic, procedural)
        }
    
    Returns:
        {
            'exercise_type': str,
            'insights': str,
            'recommendations': str,
            'encouragement': str,
            'next_steps': str
        }
    """
    model = initialize_gemini()
    if not model:
        return _default_analysis(game_data)
    
    try:
        # Build context about the player's performance
        trend = "improving" if game_data['improvement_pct'] > 0 else "needs work" if game_data['improvement_pct'] < 0 else "stable"
        performance_level = "excellent" if game_data['avg_score'] >= 80 else "good" if game_data['avg_score'] >= 60 else "developing"
        
        prompt = f"""
You are a cognitive rehabilitation specialist analyzing a patient's memory game performance.

Game: {game_data['display_name']}
Domain: {game_data['domain']} memory
Sessions Completed: {game_data['total_sessions']}
Average Score: {game_data['avg_score']:.1f}%
Best Score: {game_data['best_score']:.1f}%
Worst Score: {game_data['worst_score']:.1f}%
Overall Improvement: {game_data['improvement_pct']:+.1f}%
Recent Performance: {', '.join([f'{s:.0f}%' for s in game_data['recent_scores'][-5:]])}

Based on this {game_data['domain']} memory exercise data:

1. **Performance Insights** (2-3 sentences analyzing their current performance level and trends)
2. **Personalized Recommendations** (2-3 specific, actionable tips to improve)
3. **Encouragement** (1-2 sentences of motivational support)
4. **Next Steps** (1-2 specific goals or challenges to work towards)

Keep the tone warm, professional, and encouraging. Focus on progress and growth.
"""
        
        response = model.generate_content(prompt)
        analysis_text = response.text
        
        # Parse the response into sections
        sections = {
            'insights': '',
            'recommendations': '',
            'encouragement': '',
            'next_steps': ''
        }
        
        current_section = None
        for line in analysis_text.split('\n'):
            if '**Performance Insights**' in line:
                current_section = 'insights'
            elif '**Personalized Recommendations**' in line:
                current_section = 'recommendations'
            elif '**Encouragement**' in line:
                current_section = 'encouragement'
            elif '**Next Steps**' in line:
                current_section = 'next_steps'
            elif current_section and line.strip():
                sections[current_section] += line.strip() + ' '
        
        return {
            'exercise_type': game_data['exercise_type'],
            'insights': sections['insights'].strip(),
            'recommendations': sections['recommendations'].strip(),
            'encouragement': sections['encouragement'].strip(),
            'next_steps': sections['next_steps'].strip(),
            'ai_generated': True
        }
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return _default_analysis(game_data)


def analyze_all_games(games_list: list) -> dict:
    """
    Analyze overall game portfolio and identify strengths/weaknesses.
    
    Args:
        games_list: List of game performance dicts
    
    Returns:
        {
            'overall_analysis': str,
            'strongest_domain': str,
            'needs_improvement': str,
            'portfolio_recommendations': str
        }
    """
    model = initialize_gemini()
    if not model:
        return _default_portfolio_analysis(games_list)
    
    try:
        # Calculate aggregate stats
        games_summary = "\n".join([
            f"- {g['display_name']}: {g['avg_score']:.0f}% avg, {g['improvement_pct']:+.0f}% trend, {g['total_sessions']} sessions"
            for g in games_list
        ])
        
        avg_all = sum(g['avg_score'] for g in games_list) / len(games_list) if games_list else 0
        
        prompt = f"""
You are a cognitive rehabilitation specialist reviewing a patient's overall memory training portfolio.

Summary of Games:
{games_summary}

Overall Average Score: {avg_all:.1f}%
Total Games: {len(games_list)}

Provide a brief, encouraging analysis:

1. **Portfolio Overview** (1-2 sentences on their overall cognitive training status)
2. **Strongest Area** (Which memory domain they excel in and why)
3. **Growth Opportunity** (Which domain needs more focus and why)
4. **Strategy Recommendation** (1-2 specific recommendations for balanced improvement)

Keep it concise, positive, and actionable.
"""
        
        response = model.generate_content(prompt)
        return {
            'overall_analysis': response.text,
            'ai_generated': True
        }
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return _default_portfolio_analysis(games_list)


def _default_analysis(game_data: dict) -> dict:
    """Fallback analysis when API is unavailable."""
    avg = game_data['avg_score']
    improvement = game_data['improvement_pct']
    
    insights = f"You're performing at {avg:.0f}% accuracy on {game_data['display_name']}."
    
    if improvement > 5:
        insights += " Your scores are trending upward—keep up the consistent practice!"
    elif improvement < -5:
        insights += " Your scores are dipping recently. Take a break and return refreshed."
    else:
        insights += " You've maintained a stable performance level."
    
    recommendations = ""
    if avg < 50:
        recommendations = "Start with easier difficulty levels to build confidence. Gradually increase challenge as accuracy improves."
    elif avg < 70:
        recommendations = "You're on the right track! Try increasing the difficulty level to continue challenging your memory."
    else:
        recommendations = "Consider pushing to higher difficulty levels to maximize cognitive stimulation."
    
    encouragement = "Every session strengthens your neural pathways. Progress takes time—celebrate your efforts!"
    next_steps = f"Target: Reach {min(avg + 10, 100):.0f}% accuracy by your next milestone."
    
    return {
        'exercise_type': game_data['exercise_type'],
        'insights': insights,
        'recommendations': recommendations,
        'encouragement': encouragement,
        'next_steps': next_steps,
        'ai_generated': False
    }


def _default_portfolio_analysis(games_list: list) -> dict:
    """Fallback portfolio analysis when API is unavailable."""
    if not games_list:
        return {
            'overall_analysis': "Start playing games to build your cognitive training portfolio!",
            'ai_generated': False
        }
    
    avg_all = sum(g['avg_score'] for g in games_list) / len(games_list)
    best_game = max(games_list, key=lambda x: x['avg_score'])
    worst_game = min(games_list, key=lambda x: x['avg_score'])
    
    analysis = f"""
You've completed {len(games_list)} different cognitive games with an overall average of {avg_all:.0f}%.

**Strongest Area:** Your best performance is in {best_game['display_name']} ({best_game['avg_score']:.0f}%).

**Growth Opportunity:** {worst_game['display_name']} ({worst_game['avg_score']:.0f}%) is where you can improve most.

**Recommendation:** Continue practicing your weaker areas while maintaining your strengths. Balanced cognitive training develops all memory domains.
"""
    
    return {
        'overall_analysis': analysis,
        'ai_generated': False
    }
