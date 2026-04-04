from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from cognitive_backend.db.database import get_db
from cognitive_backend.models.models import User, TherapistPatient, CognitiveSession
from cognitive_backend.schemas.schemas import AssignPatient, PatientSummary, UserOut, ProgressSummary
from cognitive_backend.services.auth_service import require_role
from cognitive_backend.routers.progress import _get_patient_summary

router = APIRouter(prefix="/api/therapist", tags=["Therapist"])


@router.post("/assign-patient", status_code=201)
def assign_patient(
    payload: AssignPatient,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("therapist", "admin")),
):
    """Assign a patient to this therapist."""
    patient = db.query(User).filter(User.id == payload.patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(TherapistPatient).filter(
        TherapistPatient.therapist_id == current_user.id,
        TherapistPatient.patient_id == payload.patient_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient already assigned")

    link = TherapistPatient(therapist_id=current_user.id, patient_id=payload.patient_id)
    db.add(link)
    db.commit()
    return {"message": f"Patient {patient.full_name} assigned successfully"}


@router.get("/patients", response_model=List[PatientSummary])
def get_my_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("therapist", "admin")),
):
    """Get all patients assigned to this therapist with summary stats."""
    links = db.query(TherapistPatient).filter(TherapistPatient.therapist_id == current_user.id).all()
    result = []
    for link in links:
        patient = db.query(User).filter(User.id == link.patient_id).first()
        sessions = db.query(CognitiveSession).filter(CognitiveSession.patient_id == patient.id).all()
        avg = round(sum(s.score_pct for s in sessions) / len(sessions), 1) if sessions else 0
        last = max((s.completed_at for s in sessions), default=None)
        result.append(PatientSummary(
            patient=patient,
            total_sessions=len(sessions),
            avg_accuracy=avg,
            last_session=last,
        ))
    return result


@router.get("/patients/{patient_id}/progress", response_model=ProgressSummary)
def get_patient_progress(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("therapist", "admin")),
):
    """Get full progress summary for a specific patient (therapist only)."""
    # Verify therapist has access to this patient
    if current_user.role == "therapist":
        link = db.query(TherapistPatient).filter(
            TherapistPatient.therapist_id == current_user.id,
            TherapistPatient.patient_id == patient_id,
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Patient not assigned to you")

    return _get_patient_summary(patient_id, db)


@router.get("/patients/list-all", response_model=List[UserOut])
def list_all_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("therapist", "admin")),
):
    """List all registered patients (for assignment dropdown)."""
    return db.query(User).filter(User.role == "patient", User.is_active == True).all()
