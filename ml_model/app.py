import os
from datetime import datetime
from typing import Optional

import psycopg2
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import model as ml

load_dotenv()

app = FastAPI(title="Lightning Line ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    service_type:    str
    priority_level:  str   = "regular"
    hour_of_day:     Optional[int]   = None   # defaults to current hour
    day_of_week:     Optional[int]   = None   # defaults to today
    queue_length:    int   = 0
    active_counters: int   = 1
    avg_handle_time: float = 15.0             # rolling avg minutes per ticket for active staff


class PredictResponse(BaseModel):
    estimated_wait_minutes: float
    confidence: str


class TrainResponse(BaseModel):
    message: str
    samples: int
    mae_minutes: float
    source: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "lightning_line"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def fetch_training_data() -> pd.DataFrame:
    """Pull completed sessions from the database as training data."""
    conn = get_db_connection()
    try:
        query = """
            SELECT
                s.service_key                                           AS service_type,
                qt.priority_level,
                EXTRACT(HOUR FROM qt.checkin_time)::int                 AS hour_of_day,
                EXTRACT(DOW  FROM qt.checkin_time)::int                 AS day_of_week,
                EXTRACT(EPOCH FROM (ss.start_time - qt.checkin_time)) / 60
                                                                        AS wait_time_minutes,
                (
                    SELECT COUNT(*) FROM Staff WHERE status = 'active'
                )::int                                                  AS active_counters,
                (
                    SELECT COUNT(*) FROM QueueTickets q2
                    WHERE q2.status = 'waiting'
                      AND q2.checkin_time < qt.checkin_time
                )::int                                                  AS queue_length,
                COALESCE(
                    (
                        SELECT AVG(
                            EXTRACT(EPOCH FROM (ss2.end_time - ss2.start_time)) / 60
                        )
                        FROM ServiceSessions ss2
                        WHERE ss2.staff_id   = ss.staff_id
                          AND ss2.end_time  IS NOT NULL
                          AND ss2.start_time >= ss.start_time - INTERVAL '7 days'
                          AND ss2.start_time  < ss.start_time
                    ),
                    15.0
                )                                                       AS avg_handle_time
            FROM ServiceSessions ss
            JOIN QueueTickets qt ON ss.ticket_id = qt.ticket_id
            JOIN Services     s  ON qt.service_id = s.service_id
            WHERE qt.completed_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (ss.start_time - qt.checkin_time)) > 0
        """
        df = pd.read_sql(query, conn)
        return df
    finally:
        conn.close()


# ── Auto-train on startup ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_train():
    """Train on startup using DB data if available, otherwise synthetic data."""
    try:
        df = fetch_training_data()
        source = "database"
    except Exception:
        df = pd.DataFrame()
        source = "synthetic"

    if len(df) < 50:
        df = ml.generate_synthetic_data(1500)
        source = "synthetic"

    ml.train(df)
    print(f"[ML] Model trained on startup using {source} data ({len(df)} samples)")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    model_ready = os.path.exists(ml.MODEL_PATH)
    return {"status": "ok", "model_ready": model_ready}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    now = datetime.now()
    hour = req.hour_of_day if req.hour_of_day is not None else now.hour
    dow  = req.day_of_week  if req.day_of_week  is not None else now.weekday()

    try:
        wait = ml.predict(
            service_type=req.service_type,
            priority_level=req.priority_level,
            hour_of_day=hour,
            day_of_week=dow,
            queue_length=req.queue_length,
            active_counters=req.active_counters,
            avg_handle_time=req.avg_handle_time,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Simple confidence based on queue length
    if req.queue_length <= 3:
        confidence = "high"
    elif req.queue_length <= 10:
        confidence = "medium"
    else:
        confidence = "low"

    return PredictResponse(estimated_wait_minutes=wait, confidence=confidence)


@app.post("/train", response_model=TrainResponse)
def retrain():
    """Retrain model on latest database data (or synthetic if insufficient)."""
    source = "database"
    try:
        df = fetch_training_data()
        if len(df) < 50:
            df = ml.generate_synthetic_data(1500)
            source = "synthetic"
    except Exception:
        df = ml.generate_synthetic_data(1500)
        source = "synthetic"

    stats = ml.train(df)
    return TrainResponse(
        message="Model retrained successfully",
        samples=stats["samples"],
        mae_minutes=stats["mae_minutes"],
        source=source,
    )
