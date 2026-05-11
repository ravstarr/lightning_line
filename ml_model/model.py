import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

MODEL_PATH = "model.pkl"

SERVICE_TYPES   = ["payments", "documents", "inquiries", "registration", "other"]
PRIORITY_LEVELS = ["regular", "senior", "disabled", "emergency"]


def _encode(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["service_type_enc"]  = df["service_type"].apply(
        lambda x: SERVICE_TYPES.index(x) if x in SERVICE_TYPES else 0
    )
    df["priority_enc"] = df["priority_level"].apply(
        lambda x: PRIORITY_LEVELS.index(x) if x in PRIORITY_LEVELS else 0
    )
    return df


FEATURE_COLS = [
    "service_type_enc",
    "priority_enc",
    "hour_of_day",
    "day_of_week",
    "queue_length",
    "active_counters",
    "avg_handle_time",
]


def generate_synthetic_data(n: int = 1500) -> pd.DataFrame:
    """Generate realistic synthetic training data when real data is scarce."""
    rng = np.random.default_rng(42)

    service_types   = rng.choice(SERVICE_TYPES,   n)
    priority_levels = rng.choice(PRIORITY_LEVELS, n, p=[0.70, 0.15, 0.10, 0.05])
    hours           = rng.integers(8, 17, n)
    days            = rng.integers(0, 5, n)   # Mon-Fri
    queue_lengths   = rng.integers(0, 25, n)
    active_counters = rng.integers(1, 5, n)

    base_duration = {
        "payments":     15,
        "documents":    25,
        "inquiries":    10,
        "registration": 30,
        "other":        20,
    }

    # Staff handling speed varies per person — some clerks are faster, some slower
    avg_handle_times = []
    wait_times = []
    for i in range(n):
        base = base_duration[service_types[i]]

        # Simulate staff speed variation (±20% around the service baseline)
        staff_speed = float(rng.normal(1.0, 0.2))
        avg_handle = max(5.0, round(base * staff_speed + float(rng.normal(0, 2)), 1))
        avg_handle_times.append(avg_handle)

        # More queue → longer wait; faster staff → shorter wait
        handle_factor = avg_handle / base
        queue_factor  = queue_lengths[i] * (avg_handle / active_counters[i])

        # Peak hours: 9-10am and 1-2pm and 3-4pm
        peak = 1.3 if hours[i] in (9, 13, 15) else 1.0

        # Priority customers jump the queue
        priority_discount = {
            "regular":   1.0,
            "senior":    0.6,
            "disabled":  0.5,
            "emergency": 0.3,
        }[priority_levels[i]]

        wait = (queue_factor * peak * priority_discount * handle_factor) + float(rng.normal(0, 2))
        wait = max(1, round(wait, 1))
        wait_times.append(wait)

    return pd.DataFrame({
        "service_type":      service_types,
        "priority_level":    priority_levels,
        "hour_of_day":       hours,
        "day_of_week":       days,
        "queue_length":      queue_lengths,
        "active_counters":   active_counters,
        "avg_handle_time":   avg_handle_times,
        "wait_time_minutes": wait_times,
    })


def train(df: pd.DataFrame) -> dict:
    df = _encode(df)
    X = df[FEATURE_COLS]
    y = df["wait_time_minutes"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    mae = mean_absolute_error(y_test, model.predict(X_test))
    joblib.dump(model, MODEL_PATH)

    return {"samples": len(df), "mae_minutes": round(mae, 2)}


def predict(
    service_type: str,
    priority_level: str,
    hour_of_day: int,
    day_of_week: int,
    queue_length: int,
    active_counters: int,
    avg_handle_time: float = 15.0,
) -> float:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not trained yet. Call /train first.")

    model = joblib.load(MODEL_PATH)

    row = _encode(pd.DataFrame([{
        "service_type":    service_type,
        "priority_level":  priority_level,
        "hour_of_day":     hour_of_day,
        "day_of_week":     day_of_week,
        "queue_length":    queue_length,
        "active_counters": active_counters,
        "avg_handle_time": avg_handle_time,
    }]))

    prediction = model.predict(row[FEATURE_COLS])[0]
    return max(1, round(float(prediction), 1))
