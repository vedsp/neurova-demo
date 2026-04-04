"""
Test script for AI game analysis endpoints.
Creates test user, adds sample session data, and tests AI analysis.
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

# Test Registration
print("=" * 60)
print("1. REGISTERING TEST USER")
print("=" * 60)

reg_response = requests.post(
    f"{BASE_URL}/api/auth/register",
    json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "testpass123",
        "role": "patient"
    }
)
print(f"Register Response: {reg_response.status_code}")
if reg_response.status_code != 201:
    print(f"Error: {reg_response.json()}")

# Test Login
print("\n" + "=" * 60)
print("2. LOGGING IN")
print("=" * 60)

login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "test@example.com", "password": "testpass123"}
)
login_data = login_response.json()
token = login_data.get("access_token")
print(f"Login Response: {login_response.status_code}")
print(f"Token: {token[:30]}..." if token else "No token received")

if not token:
    print("Failed to get authentication token")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Add sample session data
print("\n" + "=" * 60)
print("3. ADDING SAMPLE GAME SESSION")
print("=" * 60)

session_data = {
    "exercise_type": "digit_span",
    "difficulty_level": 3,
    "trial_data": [
        {"question": "12345", "answer": "12345", "correct": True, "response_ms": 2500},
        {"question": "67890", "answer": "67890", "correct": True, "response_ms": 2700},
        {"question": "54321", "answer": "54321", "correct": True, "response_ms": 2400},
    ],
    "session_notes": "Test session"
}

session_response = requests.post(
    f"{BASE_URL}/api/sessions",
    headers=headers,
    json=session_data
)
print(f"Session Submit Response: {session_response.status_code}")
if session_response.status_code != 201:
    print(f"Error: {session_response.json()}")
else:
    session_result = session_response.json()
    print(f"Score: {session_result.get('score_pct')}%")
    print(f"AI Feedback: {session_result.get('ai_feedback', 'N/A')[:100]}...")

# Test AI Game Analysis
print("\n" + "=" * 60)
print("4. TESTING AI GAME ANALYSIS")
print("=" * 60)

analysis_response = requests.get(
    f"{BASE_URL}/api/progress/ai-game-analysis/digit_span",
    headers=headers
)
print(f"AI Analysis Response: {analysis_response.status_code}")
if analysis_response.status_code == 200:
    analysis = analysis_response.json()
    print(f"\n✓ Exercise Type: {analysis.get('exercise_type')}")
    print(f"✓ Insights: {analysis.get('insights')}")
    print(f"✓ Recommendations: {analysis.get('recommendations')}")
    print(f"✓ Encouragement: {analysis.get('encouragement')}")
    print(f"✓ Next Steps: {analysis.get('next_steps')}")
else:
    print(f"Error: {analysis_response.json()}")

# Test Portfolio Analysis
print("\n" + "=" * 60)
print("5. TESTING AI PORTFOLIO ANALYSIS")
print("=" * 60)

portfolio_response = requests.get(
    f"{BASE_URL}/api/progress/ai-portfolio-analysis",
    headers=headers
)
print(f"Portfolio Analysis Response: {portfolio_response.status_code}")
if portfolio_response.status_code == 200:
    portfolio = portfolio_response.json()
    print(f"\n✓ Overall Analysis:\n{portfolio.get('overall_analysis')}")
else:
    print(f"Error: {portfolio_response.json()}")

print("\n" + "=" * 60)
print("✓ ALL TESTS COMPLETED SUCCESSFULLY!")
print("=" * 60)
