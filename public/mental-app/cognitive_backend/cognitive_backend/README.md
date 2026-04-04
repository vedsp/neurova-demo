# 🧠 Cognitive Memory Improvement — Backend Module

Part of the **AI-Powered Rehabilitation Platform** (Hackathon PS #2).

This is a standalone FastAPI backend for the **cognitive memory improvement** feature.
Your teammates' modules (physical joint recovery, etc.) can plug into this same pattern.

---

## 📁 Project Structure

```
cognitive_backend/
├── main.py                        # FastAPI app entry point
├── config.py                      # Settings from .env
├── requirements.txt
├── .env.example                   # Copy to .env and fill in
│
├── db/
│   └── database.py                # SQLAlchemy engine + session
│
├── models/
│   └── models.py                  # ORM models (User, CognitiveSession, etc.)
│
├── schemas/
│   └── schemas.py                 # Pydantic request/response schemas
│
├── services/
│   ├── auth_service.py            # JWT auth + password hashing
│   ├── scoring_service.py         # Score computation + adaptive difficulty
│   └── ai_feedback_service.py     # Claude AI feedback generation
│
└── routers/
    ├── auth.py                    # /api/auth/*
    ├── sessions.py                # /api/sessions/*
    ├── progress.py                # /api/progress/*
    └── therapist.py               # /api/therapist/*
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
cd cognitive_backend
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run the server
```bash
uvicorn main:app --reload --port 8000
```

### 4. Open API docs
```
http://localhost:8000/docs      ← Swagger UI (interactive)
http://localhost:8000/redoc     ← ReDoc
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register patient or therapist |
| POST | `/api/auth/login` | Login → returns JWT token |
| GET  | `/api/auth/me` | Get current user profile |

### Sessions (Patient)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Submit completed exercise session |
| GET  | `/api/sessions` | Get my session history |
| GET  | `/api/sessions/{id}` | Get single session detail |
| GET  | `/api/sessions/adaptive-difficulty/{type}` | Get recommended difficulty |

### Progress & Analytics (Patient)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress/summary` | Full progress dashboard data |
| GET | `/api/progress/weekly-trend` | Week-by-week accuracy trend |
| GET | `/api/progress/composite-index` | Weighted memory index score |

### Therapist
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/therapist/assign-patient` | Assign patient to therapist |
| GET  | `/api/therapist/patients` | List assigned patients with stats |
| GET  | `/api/therapist/patients/{id}/progress` | View patient's full progress |
| GET  | `/api/therapist/patients/list-all` | All patients (for dropdown) |

---

## 🔗 Frontend Integration

### Step 1: Login and store token
```javascript
const res = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ username: email, password: password })
});
const { access_token } = await res.json();
localStorage.setItem('token', access_token);
```

### Step 2: Get recommended difficulty before starting exercise
```javascript
const res = await fetch('http://localhost:8000/api/sessions/adaptive-difficulty/digit_span', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
const { recommended_level } = await res.json();
```

### Step 3: Submit session after exercise completes
```javascript
await fetch('http://localhost:8000/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    exercise_type: 'digit_span',   // digit_span | pattern_recall | word_recall | sequence_memory
    difficulty_level: 4,
    trial_data: [
      { question: [3,7,2,9], answer: [3,7,2,9], correct: true,  response_ms: 3200 },
      { question: [1,5,8],   answer: [1,5,9],   correct: false, response_ms: 2800 },
    ]
  })
});
// Response includes ai_feedback (real Claude AI text), score_pct, etc.
```

### Step 4: Load progress dashboard
```javascript
const res = await fetch('http://localhost:8000/api/progress/summary', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
const data = await res.json();
// data.domain_scores, data.recent_sessions, data.composite_index, etc.
```

---

## AI Cognitive Engine

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI feedback.
Without it, the system falls back to rule-based feedback automatically — no crash.

---

## 🏗 Integration with Other Team Modules

When your team merges everything on GitHub:

1. **Share the `User` model** — all modules use the same `users` table
2. **Each module has its own router** — just `app.include_router(cognitive_router)` in the main app
3. **CORS** is already configured — update `ALLOWED_ORIGINS` in `.env` to add the shared frontend URL
4. **Database** — swap `DATABASE_URL` in `.env` to PostgreSQL for production

---

## 🗄 Database

- **Development**: SQLite (auto-created as `cognitive_rehab.db`) — zero setup
- **Production**: PostgreSQL — just change `DATABASE_URL` in `.env`

Tables created automatically on first run:
- `users`
- `cognitive_sessions`
- `memory_scores`
- `therapist_patients`
