from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from cognitive_backend.config import settings
from cognitive_backend.db.database import engine, Base
import cognitive_backend.models.models  # ensure all models are registered before create_all

from cognitive_backend.routers import auth, sessions, progress, therapist


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables on startup
    Base.metadata.create_all(bind=engine)
    print(f"✅  {settings.APP_NAME} backend started — DB tables ready")
    yield
    print("🛑  Shutting down")


app = FastAPI(
    title="CognitiveRehab API",
    description="""
## Cognitive Memory Rehabilitation Backend

Part of the AI-Powered Rehabilitation Platform.
This module handles **cognitive memory improvement** — exercise sessions, scoring,
adaptive difficulty, AI feedback, and progress analytics.

### Other platform modules can integrate via:
- `POST /api/sessions` — submit a completed session
- `GET /api/progress/summary` — get patient progress
- `GET /api/sessions/adaptive-difficulty/{exercise_type}` — get recommended level
""",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(progress.router)
app.include_router(therapist.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "CognitiveRehab API", "version": "1.0.0"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
